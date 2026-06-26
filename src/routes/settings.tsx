import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth, useReports, levelFor, AVATAR_OPTIONS } from "@/lib/store";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Profile & Settings — IssueSnap" }] }),
  beforeLoad: () => requireAuth(),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { reports } = useReports();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name); setBio(user.bio); setCity(user.city); setAvatar(user.avatar);
      setNotifyEmail(user.notifyEmail); setNotifyPush(user.notifyPush);
    }
  }, [user]);

  if (!user) return null;
  const myReports = reports.filter((r) => r.reporterId === user.id);
  const resolved = myReports.filter((r) => r.status === "Resolved").length;
  const lvl = levelFor(user.points);

  const save = () => {
    updateProfile({ name, bio, city, avatar, notifyEmail, notifyPush });
    toast.success("Profile saved!");
  };


  return (
    <AppShell title="Profile & Settings">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">Profile</h2>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-5">
              <div className="w-24 h-24 rounded-full bg-muted grid place-items-center text-4xl overflow-hidden border border-border shrink-0">
                {avatar.startsWith("data:") ? (
                  <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <span>{avatar}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium mb-2">Profile picture</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90">
                    Upload Photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const data = ev.target?.result as string;
                          setAvatar(data);
                          updateProfile({ avatar: data });
                          toast.success("Photo updated!");
                        };
                        reader.readAsDataURL(f);
                      }
                    }} />
                  </label>
                  <span className="text-xs text-muted-foreground">or pick an emoji:</span>
                  {AVATAR_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`w-9 h-9 rounded-full grid place-items-center text-xl border ${avatar === a ? "border-primary bg-primary/10" : "border-border"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Display name">
                <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
              </Field>
              <Field label="City">
                <input value={city} onChange={(e) => setCity(e.target.value)} className="input" />
              </Field>
              <Field label="Bio" full>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="input resize-none" />
              </Field>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">Notification preferences</h2>
            <div className="space-y-3">
              <Toggle label="Email notifications" checked={notifyEmail} onChange={setNotifyEmail} />
              <Toggle label="Push notifications" checked={notifyPush} onChange={setNotifyPush} />
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">My activity</h2>
            {myReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">You haven't submitted any reports yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {myReports.slice(0, 10).map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="truncate">{r.title}</span>
                    <span className="badge-pill bg-muted text-muted-foreground">{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex gap-3">
            <button onClick={save} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium">
              Save Changes
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-5 py-2.5 rounded-lg border border-destructive/50 text-destructive font-medium flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Log out?</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to log out?</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { logout(); navigate({ to: "/" }); }}>Log out</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Level</p>
            <p className="text-2xl font-bold">{lvl.level.name}</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${lvl.progress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {user.points} pts {lvl.next ? `· ${lvl.next.min - user.points} to ${lvl.next.name}` : "· Max level"}
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 gap-3">
            <Stat label="Reports" value={myReports.length} />
            <Stat label="Resolved" value={resolved} />
            <Stat label="Points" value={user.points} />
            <Stat label="Role" value={user.role} />
          </div>
        </aside>
      </div>

      <style>{`.input{width:100%;padding:0.625rem 0.875rem;border-radius:0.5rem;border:1px solid var(--color-border);background:var(--color-background);color:var(--color-foreground);font-size:0.875rem;outline:none;}.input:focus{box-shadow:0 0 0 2px var(--color-ring);}`}</style>
    </AppShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"} relative`}
      >
        <span className={`absolute top-0.5 ${checked ? "left-5" : "left-0.5"} w-5 h-5 rounded-full bg-background transition-all`} />
      </button>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold text-lg capitalize">{value}</div>
    </div>
  );
}

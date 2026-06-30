import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireAuth } from "@/lib/auth-guard";
import { useAuth, useReports, levelFor, AVATAR_OPTIONS, censorText } from "@/lib/store";
import { apiUpdateProfile } from "@/lib/useApi";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut, Camera } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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
  const t = useT();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0]);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio);
      setCity(user.city);
      setAvatar(user.avatar);
      setNotifyEmail(user.notifyEmail);
      setNotifyPush(user.notifyPush);
    }
  }, [user]);

  if (!user) return null;

  const myReports = reports.filter((r) => r.reporterId === user.id);
  const resolved = myReports.filter((r) => r.status === "Resolved").length;
  const lvl = levelFor(user.points);

  const isCustomPhoto = avatar.startsWith("data:");

  const save = () => {
    const { text: cleanName } = censorText(name);
    const { text: cleanBio } = censorText(bio);
    updateProfile({ name: cleanName, bio: cleanBio, city, avatar, notifyEmail, notifyPush });
    apiUpdateProfile({ name: cleanName, bio: cleanBio, city, avatar, notifyEmail, notifyPush })
      .catch(() => {}); // best-effort; local store already updated
    toast.success("Profile saved!");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target?.result as string;
      setAvatar(data);
      updateProfile({ avatar: data });
      apiUpdateProfile({ avatar: data }).catch(() => {});
      toast.success("Photo updated!");
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <AppShell title={t("profileSettings")}>
      <div className="grid lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-6">
          {/* ── Profile section ── */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-5">{t("profile")}</h2>

            {/* Avatar picker */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
              {/* Preview — always shows the image or emoji, never raw text */}
              <div className="relative shrink-0">
                <div className="w-24 h-24 rounded-full bg-muted overflow-hidden border-2 border-border grid place-items-center">
                  {isCustomPhoto ? (
                    <img src={avatar} alt="Profile photo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl leading-none">{avatar}</span>
                  )}
                </div>
                {/* Camera overlay button */}
                <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer border-2 border-card hover:opacity-90 shadow">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </label>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1">Profile picture</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload a photo or pick an emoji avatar below.
                </p>

                {/* Emoji options — only shown when NOT using a custom photo */}
                {!isCustomPhoto && (
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_OPTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        className={`w-10 h-10 rounded-full grid place-items-center text-xl border-2 transition-colors ${
                          avatar === a
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                        title={a}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                )}

                {/* If custom photo — show option to switch back to emoji */}
                {isCustomPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatar(AVATAR_OPTIONS[0]);
                      updateProfile({ avatar: AVATAR_OPTIONS[0] });
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Remove photo and use emoji instead
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("displayName")}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="sfield"
                />
              </Field>
              <Field label={t("city")}>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("cityPlaceholder")}
                  className="sfield"
                />
              </Field>
              <Field label={t("bio")} full>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder={t("bioPlaceholder")}
                  className="sfield resize-none"
                />
              </Field>
            </div>
          </section>

          {/* ── Notifications ── */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">{t("notificationPrefs")}</h2>
            <div className="space-y-3">
              <Toggle label={t("emailNotifications")} checked={notifyEmail} onChange={setNotifyEmail} />
              <Toggle label={t("pushNotifications")} checked={notifyPush} onChange={setNotifyPush} />
            </div>
          </section>

          {/* ── My activity ── */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold mb-4">{t("myActivity")}</h2>
            {myReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noReportsSettings")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {myReports.slice(0, 10).map((r) => (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="truncate text-sm">{r.title}</span>
                    <span className="badge-pill bg-muted text-muted-foreground shrink-0">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Actions ── */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={save}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
            >
              {t("saveChanges")}
            </button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="px-5 py-2.5 rounded-lg border border-destructive/50 text-destructive font-medium flex items-center gap-2 hover:bg-destructive/5">
                  <LogOut className="w-4 h-4" /> {t("logOut")}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("logOutTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("logOutConfirm")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      logout();
                      navigate({ to: "/" });
                    }}
                  >
                    {t("logOut")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ── Sidebar — only image, username, points ── */}
        <aside className="space-y-4">
          {/* Profile card — clean: photo + name + points only */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-muted overflow-hidden border-2 border-border grid place-items-center mb-3">
              {isCustomPhoto ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl leading-none">{avatar}</span>
              )}
            </div>
            <p className="font-bold text-lg leading-tight">{user.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
            <div className="mt-3 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm">
              {user.points} pts
            </div>
          </div>

          {/* Level progress */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Level</p>
            <p className="text-xl font-bold">{lvl.level.name}</p>
            <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${lvl.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {user.points} pts
              {lvl.next ? ` · ${lvl.next.min - user.points} to ${lvl.next.name}` : " · Max level"}
            </p>
          </div>

          {/* Stats */}
          <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-2 gap-3">
            <Stat label="Reports" value={myReports.length} />
            <Stat label="Resolved" value={resolved} />
          </div>
        </aside>
      </div>

      <style>{`
        .sfield {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          color: var(--color-foreground);
          font-size: 0.875rem;
          outline: none;
          box-sizing: border-box;
        }
        .sfield:focus { box-shadow: 0 0 0 2px var(--color-ring); border-color: transparent; }
      `}</style>
    </AppShell>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
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

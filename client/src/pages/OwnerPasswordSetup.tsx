import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

export default function OwnerPasswordSetup() {
  const { user, loading } = useAuth({ scope: "owner" });
  const utils = trpc.useUtils();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const setPassword = trpc.auth.setPassword.useMutation({
    onSuccess: async () => {
      await utils.auth.ownerMe.invalidate();
      setError("");
      setNotice("Owner password saved. Use Owner sign in to start your separate owner session.");
    },
    onError: issue => setError(issue.message),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setPassword.mutate({ password });
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#FFF4E1] text-sm text-[#1A312C]/60">Checking owner access…</main>;
  if (!user || user.role !== "admin") return <main className="grid min-h-screen bg-[#FFF4E1] px-5"><section className="m-auto max-w-lg rounded-[1.5rem] border border-[#1A312C]/12 bg-white p-8 text-center shadow-[0_24px_70px_rgba(26,49,44,.12)]"><LockKeyhole className="mx-auto size-8 text-[#428475]" /><p className="eyebrow mt-5">Owner setup</p><h1 className="display mt-2 text-4xl text-[#1A312C]">Open this from your existing owner access.</h1><p className="mt-4 text-sm leading-6 text-[#1A312C]/64">This one-time step requires the existing administrator session. It cannot be opened with a customer account or a new password.</p><Link href="/owner/login" className="button-primary buttonlike mt-7">Owner sign in <ArrowRight className="size-4" /></Link></section></main>;

  return <main className="min-h-screen bg-[#FFF4E1] px-4 py-6 sm:px-6 sm:py-10"><section className="mx-auto max-w-xl rounded-[1.7rem] border border-[#1A312C]/12 bg-white p-6 shadow-[0_24px_70px_rgba(26,49,44,.12)] sm:p-10"><Link href="/owner" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475] hover:text-[#1A312C]"><ArrowLeft className="size-4" />Back to Owner Dashboard</Link><div className="mt-10 rounded-2xl bg-[#1A312C] p-6 text-[#FFF4E1]"><ShieldCheck className="size-5 text-[#89D7B7]" /><p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[.14em] text-[#89D7B7]">One-time owner setup</p><h1 className="display mt-2 text-4xl">Create your direct owner password.</h1><p className="mt-3 text-sm leading-6 text-[#FFF4E1]/70">You are recognised through the existing administrator session. This password will be used only at the separate Owner sign-in page.</p></div><form onSubmit={submit} className="mt-7 grid gap-5"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>New owner password</span><input required minLength={8} name="password" type="password" autoComplete="new-password" className="form-field" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Confirm owner password</span><input required minLength={8} name="confirmPassword" type="password" autoComplete="new-password" className="form-field" /></label>{error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}{notice && <div className="rounded-xl border border-[#428475]/20 bg-[#89D7B7]/18 p-4 text-sm leading-6 text-[#1A312C]"><p>{notice}</p><Link href="/owner/login" className="mt-3 inline-flex items-center gap-2 font-bold text-[#428475] hover:text-[#1A312C]">Go to Owner sign in <ArrowRight className="size-4" /></Link></div>}<button disabled={setPassword.isPending} className="button-primary w-full disabled:opacity-60">{setPassword.isPending ? "Saving…" : "Save owner password"}<ArrowRight className="size-4" /></button></form></section></main>;
}

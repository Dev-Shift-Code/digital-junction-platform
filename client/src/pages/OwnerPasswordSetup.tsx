import { trpc } from "@/lib/trpc";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

export default function OwnerPasswordSetup() {
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const setup = trpc.auth.ownerSetup.useMutation({
    onSuccess: async () => {
      await utils.auth.ownerMe.invalidate();
      window.location.assign("/owner");
    },
    onError: issue => setError(issue.message),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setup.mutate({ email: String(form.get("email") ?? ""), setupToken: String(form.get("setupToken") ?? ""), password });
  };

  return <main className="min-h-screen bg-[#FFF4E1] px-4 py-6 sm:px-6 sm:py-10"><section className="mx-auto max-w-xl rounded-[1.7rem] border border-[#1A312C]/12 bg-white p-6 shadow-[0_24px_70px_rgba(26,49,44,.12)] sm:p-10"><Link href="/owner/login" className="inline-flex items-center gap-2 text-sm font-bold text-[#428475] hover:text-[#1A312C]">Back to Owner sign in</Link><div className="mt-8 rounded-2xl bg-[#1A312C] p-6 text-[#FFF4E1]"><ShieldCheck className="size-5 text-[#89D7B7]" /><p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[.14em] text-[#89D7B7]">One-time owner setup</p><h1 className="display mt-2 text-4xl">Create your direct owner password.</h1><p className="mt-3 text-sm leading-6 text-[#FFF4E1]/70">Enter the configured owner email and private setup token once. This creates an independent Owner Dashboard session without changing Client Side access.</p></div><form onSubmit={submit} className="mt-7 grid gap-5"><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Owner email</span><input required name="email" type="email" autoComplete="email" className="form-field" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Owner setup token</span><input required name="setupToken" type="password" autoComplete="off" className="form-field" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>New owner password</span><input required minLength={8} name="password" type="password" autoComplete="new-password" className="form-field" /></label><label className="grid gap-2 text-sm font-bold text-[#1A312C]"><span>Confirm owner password</span><input required minLength={8} name="confirmPassword" type="password" autoComplete="new-password" className="form-field" /></label>{error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<button disabled={setup.isPending} className="button-primary w-full disabled:opacity-60">{setup.isPending ? "Creating secure owner access…" : "Create owner access"}<ArrowRight className="size-4" /></button></form><div className="mt-6 flex items-start gap-3 rounded-xl border border-[#1A312C]/10 bg-[#FFF4E1]/65 p-4 text-xs leading-5 text-[#1A312C]/65"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-[#428475]" /><p>This private token is required only for one-time owner setup. Once the password is created, use the normal Owner sign-in page.</p></div></section></main>;
}

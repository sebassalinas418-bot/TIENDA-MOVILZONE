"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStoreConfig } from "@/config/store-config";
import { useAdminAccess } from "@/lib/admin-access";
import {
  isStoreOwnerEmail,
  type DemoSession,
} from "@/lib/session";
import { StoreAuthContactFields } from "@/components/store-auth-contact-fields";
import {
  authenticateStoreUser,
  registerStoreUser,
  resendStoreVerification,
} from "@/lib/store-auth-client";
import { looksLikeEmail } from "@/lib/store-phone-auth/phone";

type AccountMenuProps = {
  session: DemoSession | null;
  onLogout: () => void;
};

function firstName(session: DemoSession) {
  return session.name.trim().split(/\s+/)[0] || session.name;
}

export function AccountMenu({ session, onLogout }: AccountMenuProps) {
  const router = useRouter();
  const { config } = useStoreConfig();
  const { isAdmin, setDevAdmin } = useAdminAccess(session);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [devLink, setDevLink] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const owner = isStoreOwnerEmail(session?.email);
  const recoverHref = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola, necesito recuperar el acceso a mi cuenta de Movil zone.")}`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!session) return;
    setError("");
    setNotice("");
    setPassword("");
  }, [session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setDevLink("");
    setBusy(true);
    try {
      if (mode === "register") {
        const body = await registerStoreUser(name, email, password, phone);
        if (!body.ok) {
          setError(body.error || "No se pudo crear la cuenta.");
          return;
        }
        if (body.phoneOnly) {
          setIdentifier(phone.trim());
          setNotice("Cuenta lista. Ya podés entrar con tu celular y contraseña.");
          setMode("login");
          return;
        }
        setNotice(
          body.mailed
            ? "Te enviamos un enlace a tu correo. Confirmalo para activar la cuenta."
            : "Cuenta creada. Confirmá el correo con el enlace.",
        );
        if (body.devVerifyUrl) setDevLink(body.devVerifyUrl);
        setIdentifier(email.trim());
        setMode("login");
        return;
      }
      const result = await authenticateStoreUser(identifier, password, remember);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.push(result.verified ? "/" : "/mi-cuenta");
    } catch {
      setError(mode === "register" ? "No se pudo crear la cuenta." : "No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRecover() {
    const target = looksLikeEmail(identifier) ? identifier.trim().toLowerCase() : email.trim().toLowerCase();
    if (!target || !looksLikeEmail(target)) {
      setError("Ingresá tu correo para ayudarte a recuperar el acceso.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = await resendStoreVerification(target);
      if (body.ok) {
        setNotice(
          body.mailed
            ? "Si la cuenta existe, te reenviamos el correo de verificación."
            : "Generamos un enlace de verificación. Si no es eso, escribinos por WhatsApp.",
        );
        if (body.devVerifyUrl) setDevLink(body.devVerifyUrl);
        return;
      }
      setNotice("Para restablecer la contraseña, escribinos por WhatsApp.");
    } catch {
      setNotice("Para restablecer la contraseña, escribinos por WhatsApp.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
      >
        <UserIcon />
        {session ? firstName(session) : "Mi cuenta"}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={session ? "Menú de cuenta" : "Iniciar sesión"}
          className="absolute right-0 z-50 mt-2 w-[min(22.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-black/5 bg-white text-neutral-900 shadow-[0_24px_60px_-20px_rgba(2,8,23,0.55)]"
        >
          {session ? (
            <div className="p-3">
              <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 text-white">
                <p className="text-sm font-bold leading-5">{session.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-white/80">{session.email}</p>
              </div>
              <nav className="mt-2 grid gap-1">
                <Link
                  href="/mi-cuenta?seccion=cuenta"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-sky-50 hover:text-sky-700"
                >
                  Mi perfil
                </Link>
                <Link
                  href="/mi-cuenta?seccion=pedidos"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-sky-50 hover:text-sky-700"
                >
                  Mis pedidos
                </Link>
                {owner ? (
                  <>
                    <label className="mt-1 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm">
                      <span className="font-semibold text-slate-800">
                        Modo administrador
                        <span className="mt-0.5 block text-[11px] font-normal text-slate-500">
                          Solo visible para {session.email}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isAdmin}
                        disabled={session.role === "admin"}
                        onChange={(event) => setDevAdmin(event.target.checked)}
                        className="h-4 w-4 accent-sky-500 disabled:opacity-70"
                      />
                    </label>
                    {isAdmin ? (
                      <Link
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="rounded-2xl bg-sky-500 px-3 py-2.5 text-center text-sm font-bold text-white hover:bg-sky-400"
                      >
                        Abrir Panel Admin
                      </Link>
                    ) : null}
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout();
                  }}
                  className="rounded-2xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Cerrar sesión
                </button>
              </nav>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="p-4" noValidate>
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-bold ${
                    mode === "login" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className={`rounded-xl px-3 py-2 text-sm font-bold ${
                    mode === "register" ? "bg-white text-sky-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <StoreAuthContactFields
                  mode={mode}
                  name={name}
                  onName={setName}
                  identifier={identifier}
                  onIdentifier={setIdentifier}
                  email={email}
                  onEmail={setEmail}
                  phone={phone}
                  onPhone={setPhone}
                  password={password}
                  onPassword={setPassword}
                  labelClassName="block text-xs font-bold tracking-wide text-slate-500 uppercase"
                  inputClassName="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-neutral-900 outline-none focus:border-sky-400 focus:bg-white"
                />
              </div>

              {mode === "login" ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="h-4 w-4 rounded accent-sky-500"
                    />
                    Recuérdame
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleRecover()}
                    className="text-xs font-bold text-sky-600 hover:text-sky-700"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              ) : null}

              {notice ? <p className="mt-3 text-xs leading-5 text-emerald-700">{notice}</p> : null}
              {devLink ? (
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Enlace:{" "}
                  <a href={devLink} className="font-semibold text-sky-700 underline">
                    verificar correo
                  </a>
                </p>
              ) : null}
              {error ? (
                <p className="mt-3 text-xs text-rose-600" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="mt-4 w-full rounded-2xl bg-sky-500 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:opacity-50"
              >
                {busy ? "Esperá..." : mode === "register" ? "Crear cuenta" : "Entrar"}
              </button>
              {mode === "login" ? (
                <a
                  href={recoverHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-center text-[11px] font-semibold text-slate-500 hover:text-sky-600"
                >
                  Recuperar acceso por WhatsApp
                </a>
              ) : (
                <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
                  Con celular podés entrar de una. Con correo te mandamos un enlace de confirmación.
                </p>
              )}
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.2" />
      <path d="M3.5 13.2c.7-2 2.3-3 4.5-3s3.8 1 4.5 3" strokeLinecap="round" />
    </svg>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteFrame } from "@/components/site-frame";
import { useStoreConfig } from "@/config/store-config";
import { StoreAuthContactFields } from "@/components/store-auth-contact-fields";
import { authenticateStoreUser, registerStoreUser, resendStoreVerification } from "@/lib/store-auth-client";
import { looksLikeEmail } from "@/lib/store-phone-auth/phone";

export default function LoginPage() {
  const router = useRouter();
  const { config } = useStoreConfig();
  const recoverHref = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hola, necesito recuperar el acceso a mi cuenta de Movil zone.")}`;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [devLink, setDevLink] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setDevLink("");
    if (mode === "register") {
      setBusy(true);
      try {
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
        setPendingEmail(email.trim().toLowerCase());
        setIdentifier(email.trim());
        setNotice(
          body.mailed
            ? "Te enviamos un enlace a tu correo. Confirmalo para activar la cuenta."
            : "Cuenta creada. Confirmá el correo con el enlace (si no llegó, usá el de abajo o Reenviar).",
        );
        if (body.devVerifyUrl) setDevLink(body.devVerifyUrl);
        setMode("login");
      } catch {
        setError("No se pudo crear la cuenta.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const result = await authenticateStoreUser(identifier, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(result.verified ? "/" : "/mi-cuenta");
    } catch {
      setError("No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    const target = pendingEmail || (looksLikeEmail(identifier) ? identifier.trim().toLowerCase() : email.trim().toLowerCase());
    if (!target || !looksLikeEmail(target)) {
      setError("Ingresá el correo para reenviar el enlace.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = await resendStoreVerification(target);
      if (!body.ok) {
        setError(body.error || "No se pudo reenviar.");
        return;
      }
      setNotice(body.mailed ? "Reenviamos el enlace a tu correo." : "Generamos un enlace nuevo.");
      if (body.devVerifyUrl) setDevLink(body.devVerifyUrl);
    } catch {
      setError("No se pudo reenviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteFrame>
      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          noValidate
        >
          <h1 className="text-xl font-bold tracking-tight">
            {mode === "register" ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          {mode === "register" ? (
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Podés crear la cuenta con correo, con celular, o con ambos. Si usás correo, te mandamos un enlace para confirmarlo.
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "login" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${mode === "register" ? "bg-black text-white" : "bg-gray-100 text-gray-700"}`}
            >
              Registrarme
            </button>
          </div>

          <div className="mt-5 space-y-4">
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
              labelClassName="block text-sm font-medium"
              inputClassName="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            />
          </div>

          {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
          {devLink ? (
            <p className="mt-2 text-xs leading-5 text-gray-600">
              Enlace de confirmación:{" "}
              <a href={devLink} className="font-semibold text-sky-700 underline">
                verificar correo
              </a>
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-neutral-800 disabled:opacity-50"
          >
            {busy ? "Esperá..." : mode === "register" ? "Crear cuenta" : "Entrar"}
          </button>
          {mode === "login" ? (
            <>
              <a
                href={recoverHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs font-semibold text-sky-700 hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </a>
              <button
                type="button"
                onClick={() => void resend()}
                disabled={busy}
                className="mt-2 w-full text-center text-xs font-semibold text-gray-500 hover:text-sky-700 hover:underline disabled:opacity-50"
              >
                Reenviar correo de verificación
              </button>
            </>
          ) : null}
        </form>
      </main>
    </SiteFrame>
  );
}

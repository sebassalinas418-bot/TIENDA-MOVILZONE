"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { SiteFrame } from "@/components/site-frame";
import { clearTallerToken, readTallerToken, signInTallerAdmin } from "@/services/taller-gestio/browser";
import {
  adminAccount,
  demoAccount,
  isListedStoreAdminEmail,
  openAdminSession,
  openCustomerSession,
  signIn,
  syncStoreSessionCookie,
} from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        const response = await fetch("/api/store-auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const body = (await response.json()) as {
          ok?: boolean;
          error?: string;
          mailed?: boolean;
          devVerifyUrl?: string;
        };
        if (!body.ok) {
          setError(body.error || "No se pudo crear la cuenta.");
          return;
        }
        setPendingEmail(email.trim().toLowerCase());
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

    const session = signIn(email, password);
    if (session) {
      clearTallerToken();
      await syncStoreSessionCookie({ email, password });
      router.push("/");
      return;
    }

    setBusy(true);
    try {
      const storeResponse = await fetch("/api/store-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const storeBody = (await storeResponse.json()) as {
        ok?: boolean;
        pending?: boolean;
        error?: string;
        customer?: { name: string; email: string; verified?: boolean };
      };
      if (storeBody.ok && storeBody.customer) {
        clearTallerToken();
        const verified = storeBody.customer.verified !== false && !storeBody.pending;
        if (isListedStoreAdminEmail(storeBody.customer.email)) {
          openAdminSession(storeBody.customer.name, storeBody.customer.email);
        } else {
          openCustomerSession(storeBody.customer.name, storeBody.customer.email, verified);
        }
        router.push(verified ? "/" : "/mi-cuenta");
        return;
      }

      const tallerAdmin = await signInTallerAdmin(email, password);
      if (!tallerAdmin) {
        setError(storeBody.error || "Esos datos no coinciden con una cuenta de la tienda ni del taller.");
        return;
      }

      openAdminSession(tallerAdmin.name, tallerAdmin.email);
      await syncStoreSessionCookie({
        email: tallerAdmin.email,
        name: tallerAdmin.name,
        tallerToken: readTallerToken(),
      });
      router.push("/");
    } catch {
      setError("No se pudo iniciar sesión.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    const target = pendingEmail || email.trim().toLowerCase();
    if (!target) {
      setError("Ingresá el correo para reenviar el enlace.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/store-auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        mailed?: boolean;
        devVerifyUrl?: string;
      };
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
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {mode === "register"
              ? "Te vamos a mandar un enlace para confirmar el correo. Hasta entonces la cuenta no puede operar."
              : "Las cuentas de prueba quedan en este navegador. El administrador de TallerGestio entra con el mismo correo del taller."}
          </p>
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

          {mode === "register" ? (
            <label className="mt-5 block text-sm font-medium">
              Nombre
              <input
                type="text"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
              />
            </label>
          ) : null}

          <label className={`block text-sm font-medium ${mode === "register" ? "mt-4" : "mt-5"}`}>
            Correo
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            />
          </label>

          <label className="mt-4 block text-sm font-medium">
            Contraseña
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-sky-500"
            />
          </label>

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
            <button
              type="button"
              onClick={() => void resend()}
              disabled={busy}
              className="mt-2 w-full text-center text-xs font-semibold text-sky-700 hover:underline disabled:opacity-50"
            >
              Reenviar correo de verificación
            </button>
          ) : null}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                signIn(demoAccount.email, demoAccount.password);
                void syncStoreSessionCookie({
                  email: demoAccount.email,
                  password: demoAccount.password,
                }).then(() => router.push("/"));
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-left text-xs leading-5 text-gray-700 hover:border-sky-400"
            >
              <span className="block font-semibold text-gray-900">Entrar como cliente</span>
              {demoAccount.email}
            </button>
            <button
              type="button"
              onClick={() => {
                signIn(adminAccount.email, adminAccount.password);
                void syncStoreSessionCookie({
                  email: adminAccount.email,
                  password: adminAccount.password,
                }).then(() => router.push("/"));
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-left text-xs leading-5 text-gray-700 hover:border-sky-400"
            >
              <span className="block font-semibold text-gray-900">Entrar como admin</span>
              {adminAccount.email}
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-gray-500">
            Cliente: {demoAccount.password}. Admin: {adminAccount.password}.
          </p>
        </form>
      </main>
    </SiteFrame>
  );
}

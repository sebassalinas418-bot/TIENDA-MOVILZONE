"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteFrame } from "@/components/site-frame";
import { openCustomerSession } from "@/lib/session";

function VerifyBody() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("Confirmando tu correo...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Falta el enlace de verificación.");
      setMessage("");
      return;
    }
    let cancel = false;
    void (async () => {
      const response = await fetch("/api/store-auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        customer?: { name: string; email: string };
      };
      if (cancel) return;
      if (!body.ok || !body.customer) {
        setError(body.error || "No se pudo confirmar el correo.");
        setMessage("");
        return;
      }
      openCustomerSession(body.customer.name, body.customer.email);
      setMessage("Correo confirmado. Ya podés usar la tienda.");
      window.setTimeout(() => router.push("/tienda"), 1200);
    })();
    return () => {
      cancel = true;
    };
  }, [router, token]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
      <div className="w-full rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight">Verificar correo</h1>
        {message ? <p className="mt-3 text-sm leading-6 text-gray-600">{message}</p> : null}
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <SiteFrame>
      <Suspense fallback={<div className="min-h-40" />}>
        <VerifyBody />
      </Suspense>
    </SiteFrame>
  );
}

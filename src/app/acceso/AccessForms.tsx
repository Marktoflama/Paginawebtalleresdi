"use client";

import { useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StatusRow } from "@/components/ui/StatusRow";
import { useFocusOnError } from "@/components/ui/useFocusOnError";
import { BOOKING_RULES } from "@/config/booking";
import { studentEmailError } from "@/lib/auth/domain";
import { confirmMagicLink, requestAccess, verifyCode, type AccessState } from "./actions";

const initial: AccessState = { status: "idle" };

/**
 * Students are checked in the browser before anything is sent; the server
 * action, the Auth hook and the database trigger check again. The staff
 * variant skips the browser check because the admin allowlist is server-only.
 */
export function RequestAccessForm({ next, staff = false }: { next: string; staff?: boolean }) {
  const [state, action, pending] = useActionState(requestAccess, initial);
  // A fresh object per failed attempt so focus moves back even if the message repeats.
  const [clientError, setClientError] = useState<{ message: string } | null>(null);
  const fieldError = clientError?.message ?? state.fieldError ?? null;
  useFocusOnError("email", fieldError, clientError ?? state);

  function checkBeforeSending(event: FormEvent<HTMLFormElement>) {
    if (staff) return;
    const message = studentEmailError(String(new FormData(event.currentTarget).get("email") ?? ""));
    // preventDefault also stops React from dispatching the form action.
    if (message) event.preventDefault();
    setClientError(message ? { message } : null);
  }

  return (
    <form action={action} onSubmit={checkBeforeSending} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="next" value={next} />
      {state.message ? <StatusRow tone="error">{state.message}</StatusRow> : null}
      <Field
        id="email"
        name="email"
        type="email"
        label="Correo"
        required
        autoComplete="email"
        inputMode="email"
        spellCheck={false}
        autoCapitalize="none"
        defaultValue={state.email ?? ""}
        error={fieldError}
        hint={
          staff
            ? "El correo que figura en la lista de administración del taller."
            : `Solo correos @${BOOKING_RULES.allowedDomain}, por ejemplo nombre.apellido@${BOOKING_RULES.allowedDomain}.`
        }
      />
      <div>
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? "Enviando…" : "Enviar enlace"}
        </Button>
      </div>
    </form>
  );
}

export function VerifyCodeForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(verifyCode, initial);
  useFocusOnError("code", state.fieldError, state);
  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="next" value={next} />
      {state.message ? <StatusRow tone="error">{state.message}</StatusRow> : null}
      <Field
        id="code"
        name="code"
        label="Código de 6 cifras"
        required
        autoComplete="one-time-code"
        inputMode="numeric"
        spellCheck={false}
        pattern="[0-9 ]*"
        maxLength={7}
        className="max-w-xs"
        error={state.fieldError ?? null}
      />
      <div>
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? "Comprobando…" : "Entrar"}
        </Button>
      </div>
    </form>
  );
}

export function ConfirmLinkForm({ tokenHash, type, next }: { tokenHash: string; type: string; next: string }) {
  const [state, action, pending] = useActionState(confirmMagicLink, initial);
  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="next" value={next} />
      {state.message ? <StatusRow tone="error">{state.message}</StatusRow> : null}
      <div>
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </div>
    </form>
  );
}

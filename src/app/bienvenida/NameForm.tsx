"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { StatusRow } from "@/components/ui/StatusRow";
import { useFocusOnError } from "@/components/ui/useFocusOnError";
import { saveFullName, type ProfileState } from "./actions";

export function NameForm({ next, current, email }: { next: string; current: string | null; email: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveFullName, { status: "idle" });
  useFocusOnError("full_name", state.fieldError, state);
  return (
    <form action={action} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="next" value={next} />
      {state.message ? <StatusRow tone="error">{state.message}</StatusRow> : null}
      <Field
        id="full_name"
        name="full_name"
        label="Nombre y apellidos"
        required
        autoComplete="name"
        defaultValue={state.value ?? current ?? ""}
        error={state.fieldError ?? null}
        hint={`Aparecerá en tus reservas. Cuenta: ${email}`}
      />
      <div>
        <Button type="submit" disabled={pending} aria-disabled={pending}>
          {pending ? "Guardando…" : "Guardar nombre"}
        </Button>
      </div>
    </form>
  );
}

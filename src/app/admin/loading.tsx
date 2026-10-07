import { AgendaSkeleton } from "@/components/bookings/AgendaSkeleton";
import { PageTitle } from "@/components/ui/Typography";

export default function LoadingAdmin() {
  return (
    <div className="gutter-x section-gap">
      <PageTitle>Admin</PageTitle>
      <h2 className="type-display-lg pb-6">Reservas</h2>
      <AgendaSkeleton rows={6} label="Cargando reservas…" />
    </div>
  );
}

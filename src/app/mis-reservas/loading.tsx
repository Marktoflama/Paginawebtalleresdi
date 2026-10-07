import { AgendaSkeleton } from "@/components/bookings/AgendaSkeleton";
import { PageTitle } from "@/components/ui/Typography";

export default function LoadingMyBookings() {
  return (
    <div className="gutter-x section-gap">
      <PageTitle>
        Mis
        <br />
        reservas
      </PageTitle>
      <h2 className="type-display-lg pb-6">Próximas</h2>
      <AgendaSkeleton label="Cargando tus reservas…" />
    </div>
  );
}

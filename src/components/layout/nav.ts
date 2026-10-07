export interface NavLink {
  label: string;
  href: string;
}

export interface NavCategory {
  title: string;
  links: NavLink[];
}

export interface NavViewer {
  signedIn: boolean;
  isAdmin: boolean;
}

/** Menu overlay categories (ESDI: FramerSans headings with indented light sub-links). */
export function menuCategories(viewer: NavViewer): NavCategory[] {
  const categories: NavCategory[] = [
    {
      title: "Información",
      links: [
        { label: "Cómo funciona", href: "/#como-funciona" },
        { label: "Normas", href: "/#normas" },
        { label: "Franjas libres", href: "/#franjas" },
        { label: "Preguntas frecuentes", href: "/#preguntas" },
        { label: "Privacidad", href: "/privacidad" },
      ],
    },
    {
      title: "Cuenta",
      links: viewer.signedIn
        ? [
            { label: "Tu nombre", href: "/bienvenida?editar=1" },
            { label: "Mis reservas", href: "/mis-reservas" },
          ]
        : [{ label: "Entrar con tu correo", href: "/acceso" }],
    },
  ];
  if (viewer.isAdmin) {
    categories.push({
      title: "Administración",
      links: [
        { label: "Todas las reservas", href: "/admin" },
        { label: "Excel y sincronización", href: "/admin#excel" },
      ],
    });
  }
  return categories;
}

/** Right-hand CTA column (ESDI: → internal, ↗ external). */
export function menuActions(viewer: NavViewer): NavLink[] {
  const actions: NavLink[] = [{ label: "Reservar franja", href: "/reservar" }];
  if (viewer.signedIn) actions.push({ label: "Mis reservas", href: "/mis-reservas" });
  else actions.push({ label: "Acceso", href: "/acceso" });
  if (viewer.isAdmin) actions.push({ label: "Panel de administración", href: "/admin" });
  return actions;
}

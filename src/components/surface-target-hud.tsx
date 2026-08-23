"use client";

import { useState } from "react";
import { FocusedHud } from "@/components/focused-hud";
import { useSiteLanguage } from "@/components/language-switcher";
import type { AtlasHudTarget, AtlasHudTargetId } from "@/lib/hud-targets";

export function SurfaceTargetHud({ target }: { target: AtlasHudTarget | null }) {
  const language = useSiteLanguage();
  const [open, setOpen] = useState(Boolean(target));

  if (!target) return null;
  const copy = language === "es" ? spanishTargets[target.id] : null;

  return (
    <FocusedHud
      eyebrow={copy?.eyebrow ?? target.eyebrow}
      footer={
        <p className="focused-hud-boundary">
          {language === "es" ? "Este HUD solo enfoca una superficie existente de Atlas. No envía mensajes, inicia pagos, publica ni modifica registros." : "This HUD only focuses an existing Atlas surface. It does not send messages, trigger payments, publish, or change records."}
        </p>
      }
      onClose={() => {
        setOpen(false);
        window.history.replaceState({}, "", window.location.pathname);
      }}
      open={open}
      status={copy?.status ?? target.status}
      title={copy?.title ?? target.title}
    >
      <div className="focused-hud-detail">
        <p className="focused-hud-description">{copy?.description ?? target.description}</p>
        <a className="focused-hud-link" href={target.href}>
          {copy?.linkLabel ?? target.linkLabel} <span aria-hidden="true">→</span>
        </a>
      </div>
    </FocusedHud>
  );
}

const spanishTargets: Record<AtlasHudTargetId, Omit<AtlasHudTarget, "href" | "id">> = {
  "crm-followups": {
    eyebrow: "CRM / seguimiento",
    title: "Comando de ventas",
    status: "Superficie actual de Atlas",
    description: "Abre la cola actual de prospectos, próximas acciones, estado de aprobación y detalles de seguimiento.",
    linkLabel: "Abrir seguimientos del CRM",
  },
  "sis-custom-creations": {
    eyebrow: "Fuente propia",
    title: "SIS Custom Creations",
    status: "Fuente del gráfico de Obsidian",
    description: "Abre el HUD enfocado y de solo lectura para la fuente de conocimiento configurada de SIS Custom Creations.",
    linkLabel: "Abrir detalle de la fuente SIS",
  },
  "qtime-productions": {
    eyebrow: "Fuente del cliente",
    title: "QTime Productions",
    status: "Ruta del espacio del cliente",
    description: "Abre la ruta del espacio de QTime. El acceso sigue dependiendo de la membresía autenticada y la protección de vista previa.",
    linkLabel: "Abrir espacio de QTime",
  },
  "obsidian-graph": {
    eyebrow: "Segundo cerebro",
    title: "Mapa de relaciones de Obsidian",
    status: "Superficie de bóveda configurada de solo lectura",
    description: "Abre el lienzo gráfico del Segundo cerebro y selecciona una fuente propia, del cliente, de conocimiento o de misión.",
    linkLabel: "Abrir gráfico de Obsidian",
  },
  missions: {
    eyebrow: "Misiones / proyectos",
    title: "Espacio de misiones",
    status: "Superficie actual del espacio piloto",
    description: "Abre el registro de proyectos y misiones por organización en modo de solo lectura. Los registros permanecen vacíos hasta que un flujo aprobado los cree.",
    linkLabel: "Abrir misiones",
  },
  "cash-ledger": {
    eyebrow: "Efectivo / pagos",
    title: "Registro de efectivo verificado",
    status: "Registro de organización de solo lectura",
    description: "Abre el estado de efectivo verificado y los movimientos de pago. Las entradas sin verificar nunca cuentan como efectivo verificado.",
    linkLabel: "Abrir registro de efectivo",
  },
  "agent-status": {
    eyebrow: "Estado de agentes",
    title: "Comando de agentes",
    status: "Superficie actual de Atlas",
    description: "Abre el registro de agentes y el estado de los flujos protegidos por aprobación. Un registro vacío no implica ejecuciones.",
    linkLabel: "Abrir estado de agentes",
  },
};

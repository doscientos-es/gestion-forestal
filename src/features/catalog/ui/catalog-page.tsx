import { Button } from "@doscientos/ui";
import { Pencil, Plus, Sprout } from "lucide-react";
import { useState } from "react";

import { speciesKind, useWorkspace, type Species } from "@/features/workspace";
import { formatMoney } from "@/shared/lib/format";
import { PageTop } from "@/shared/ui/page-top";
import { Panel, PanelHeader } from "@/shared/ui/surface";

import { SpeciesDialog } from "./species-dialog";

type Dialog = { species?: Species } | null;

export function CatalogPage() {
  const workspace = useWorkspace();
  const [dialog, setDialog] = useState<Dialog>(null);
  const used = (id: string) =>
    workspace.budgets.filter((budget) =>
      budget.lines.some((line) => line.kind === "plantacion" && line.speciesId === id),
    ).length;

  return (
    <>
      <PageTop
        title="Catálogo"
        description="Las especies y el coste por planta (planta + protector) con los que se calculan los presupuestos."
        actions={
          <Button onPress={() => setDialog({})}>
            <Plus aria-hidden="true" className="size-4" /> Nueva especie
          </Button>
        }
      />
      <Panel aria-labelledby="species-title">
        <PanelHeader
          id="species-title"
          icon={<Sprout className="size-5" strokeWidth={1.75} />}
          title="Especies"
          description="Si cambias un precio, los presupuestos en borrador o enviados se recalculan. Las obras aceptadas no cambian."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left text-xs">
                {["Especie", "Tipo", "Coste por planta", "Presupuestos que la usan", ""].map(
                  (header, index) => (
                    <th key={index} scope="col" className="px-5 py-3 font-medium">
                      {header || <span className="sr-only">Acciones</span>}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {workspace.species.map((item) => (
                <tr key={item.id} className="border-border border-b last:border-b-0">
                  <th scope="row" className="px-5 py-3 text-left font-semibold">
                    {item.name}
                  </th>
                  <td className="px-5 py-3">{speciesKind[item.kind]}</td>
                  <td className="px-5 py-3 tabular-nums">{formatMoney(item.unitCost, true)}</td>
                  <td className="text-muted-foreground px-5 py-3 tabular-nums">{used(item.id)}</td>
                  <td className="px-5 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Editar ${item.name}`}
                      onPress={() => setDialog({ species: item })}
                    >
                      <Pencil aria-hidden="true" className="size-3.5" /> Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {dialog ? (
        <SpeciesDialog
          key={dialog.species?.id ?? "new"}
          {...(dialog.species ? { species: dialog.species } : {})}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}

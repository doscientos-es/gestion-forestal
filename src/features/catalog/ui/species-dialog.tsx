import {
  Button,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@doscientos/ui";
import { useState } from "react";

import { speciesKind, type Species, type SpeciesKind } from "@/features/workspace";
import { useCommand } from "@/shared/lib/use-command";
import { ChoiceField, NumberField, TextField } from "@/shared/ui/form-controls";

import { catalogApi } from "../api";

/** Add a species or edit one's name, kind and cost per plant (plant + protector, VAT excluded). */
export function SpeciesDialog({ species, onClose }: { species?: Species; onClose: () => void }) {
  const [name, setName] = useState(species?.name ?? "");
  const [kind, setKind] = useState<SpeciesKind>(species?.kind ?? "conifera");
  const [cost, setCost] = useState((species?.unitCost ?? 100) / 100);
  const unitCost = Math.round(cost * 100);
  const save = useCommand(() => catalogApi.saveSpecies({ name, kind, unitCost }, species?.id), {
    success: (saved) => ({
      title: species ? "Especie actualizada" : "Especie añadida",
      description: saved.name,
    }),
    onSuccess: onClose,
  });

  return (
    <DialogRoot open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[min(28rem,calc(100vw-2rem))] rounded-xl">
        <DialogHeader>
          <DialogTitle>{species ? `Editar ${species.name}` : "Nueva especie"}</DialogTitle>
          <DialogDescription>
            {species
              ? "Las obras ya aceptadas conservan el precio con el que se presupuestaron. Los presupuestos en borrador o enviados se recalculan."
              : "Aparecerá en el desplegable de especies de los presupuestos."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            className="sm:col-span-2"
            label="Nombre"
            placeholder="Ej. Alcornoque"
            value={name}
            onChange={setName}
          />
          <ChoiceField
            label="Tipo"
            value={kind}
            onChange={(value) => setKind(value as SpeciesKind)}
            options={Object.entries(speciesKind).map(([value, label]) => ({ value, label }))}
          />
          <NumberField label="Coste por planta" suffix="€" value={cost} onChange={setCost} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onPress={onClose}>
            Cancelar
          </Button>
          <Button
            isDisabled={save.isPending || !name.trim() || unitCost <= 0}
            onPress={() => save.mutate(undefined)}
          >
            {species ? "Guardar cambios" : "Añadir especie"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}

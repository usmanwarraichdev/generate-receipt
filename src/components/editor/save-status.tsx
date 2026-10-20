import { CircleCheck, CloudOff, LoaderCircle } from "lucide-react";

export type SaveState = "new" | "saving" | "unsaved" | "saved";

/** Announced politely to screen readers whenever the state changes. */
export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <p role="status" className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
      {state === "saving" && (
        <>
          <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
          Saving…
        </>
      )}
      {state === "unsaved" && (
        <>
          <span aria-hidden className="size-2 rounded-full bg-brand" />
          Unsaved changes
        </>
      )}
      {state === "saved" && (
        <>
          <CircleCheck aria-hidden className="size-3.5 text-success" />
          All changes saved
        </>
      )}
      {state === "new" && (
        <>
          <CloudOff aria-hidden className="size-3.5" />
          Not saved yet
        </>
      )}
    </p>
  );
}

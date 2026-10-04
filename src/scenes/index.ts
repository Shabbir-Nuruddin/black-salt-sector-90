import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { SceneKey } from "../lib";
import type { SceneProps } from "./kit";

/** One lazily loaded scene per restaurant; Vite splits each into its own chunk. */
export const SCENES: Record<SceneKey, LazyExoticComponent<ComponentType<SceneProps>>> = {
  salt: lazy(() => import("./salt")),
  lanterns: lazy(() => import("./lanterns")),
  tandoor: lazy(() => import("./tandoor")),
  imarti: lazy(() => import("./imarti")),
  samosa: lazy(() => import("./samosa")),
  handi: lazy(() => import("./handi")),
  chulha: lazy(() => import("./chulha")),
  road: lazy(() => import("./road")),
  cup: lazy(() => import("./cup")),
  thali: lazy(() => import("./thali")),
  celebration: lazy(() => import("./celebration")),
  pour: lazy(() => import("./pour")),
};

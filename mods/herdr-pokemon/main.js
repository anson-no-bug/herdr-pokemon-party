// herdr-pokemon: Complete GBA/NDS Pokemon RPG Theme & Interactive World for Herdr.
// Dispatches layout blocks and overlays by props().role:
//   brand    - Top-left Pokedex header + GBA/Soft toggle
//   spaces   - Spaces as 10 iconic Poke Balls
//   agents   - Pokemon Party list with expressive PMD portraits & GBA HP bars
//   footer   - Poke Center (Settings), Link Cable (Machines), Theme & Habitat tweaker
//   tabs     - Party Tab Bar + RPG +, Bag (Files), VS Log (Changes) + Close Confirm intercept
//   pane     - Trainer Plate pane header
//   habitat  - Interactive multi-layer Pokemon world (sparring, playing, berries, tall grass, weather)
//   status   - PokeNav Trainer HUD bar
//   files    - Trainer's Bag file explorer
//   changes  - VS Log git diff & commit panel
//   menu     - RPG Command Menu (also wired as layout root terminal_menu!)
//   new-menu - RPG Summon / New popup
//   dialog   - RPG Confirm ("Close space?"), Prompt, and Theme/Habitat settings
//   toast    - RPG Adventure Banner notification (wired as layout root toast!)
//   picker   - Pokedex Pokemon Picker & Poke Ball Picker

import { View, div } from "gpui-kit";
import { props } from "herdr";
import Brand from "./brand.js";
import Spaces from "./spaces.js";
import Agents from "./agents.js";
import Footer from "./footer.js";
import Tabs from "./tabs.js";
import PaneHeader from "./pane.js";
import Habitat from "./habitat.js";
import Status from "./status.js";
import FilesPanel from "./files.js";
import ChangesPanel from "./changes.js";
import Menu from "./menu.js";
import NewMenu from "./new-menu.js";
import Dialog from "./dialog.js";
import Toast from "./toast.js";
import Picker from "./picker.js";

const ROLES = {
  brand: Brand,
  spaces: Spaces,
  agents: Agents,
  footer: Footer,
  tabs: Tabs,
  pane: PaneHeader,
  habitat: Habitat,
  status: Status,
  files: FilesPanel,
  changes: ChangesPanel,
  menu: Menu,
  "new-menu": NewMenu,
  dialog: Dialog,
  toast: Toast,
  picker: Picker,
};

function resolveRole(pr) {
  if (pr?.role && ROLES[pr.role]) return pr.role;
  // Root terminal_menu passes { tab: "pane", target, overlay } without a role field!
  if (pr?.tab && pr?.target) return "menu";
  // Root toast passes { title, body, level, overlay } without a role field!
  if (pr?.title !== undefined || pr?.level !== undefined) return "toast";
  return "habitat";
}

export default class HerdrPokemon extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const name = resolveRole(pr);
    const Role = ROLES[name];
    this.roleName = name;
    this.role = Role ? new Role() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`herdr-pokemon: unknown role "${this.roleName}"`);
    return this.role.render(cx);
  }
}

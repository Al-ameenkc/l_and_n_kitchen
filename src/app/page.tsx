import { DesktopGate } from "@/components/DesktopGate";
import { MenuApp } from "@/components/MenuApp";

export default function Home() {
  return (
    <DesktopGate>
      <MenuApp />
    </DesktopGate>
  );
}

import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useVisibility } from "@/contexts/VisibilityProvider";

export const VisibilityToggle = () => {
  const { isVisible, toggleVisibility } = useVisibility();

  return (
    <Button variant="outline" size="icon" onClick={toggleVisibility} aria-label={isVisible ? 'Ocultar valores' : 'Mostrar valores'}>
      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
};
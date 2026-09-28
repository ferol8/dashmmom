import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabTendencia } from "./tab-tendencia";
import { TabSchedule } from "./tab-schedule";
import { TabFrecuencia } from "./tab-frecuencia";

export function TabEngagement() {
  return (
    <Tabs defaultValue="tendencia" className="space-y-4">
      <TabsList className="h-auto flex-wrap bg-muted p-1">
        <TabsTrigger value="tendencia">Tendencia</TabsTrigger>
        <TabsTrigger value="horarios">Mejores horarios</TabsTrigger>
        <TabsTrigger value="frecuencia">Frecuencia y desgaste</TabsTrigger>
      </TabsList>
      <TabsContent value="tendencia"><TabTendencia /></TabsContent>
      <TabsContent value="horarios"><TabSchedule /></TabsContent>
      <TabsContent value="frecuencia"><TabFrecuencia /></TabsContent>
    </Tabs>
  );
}
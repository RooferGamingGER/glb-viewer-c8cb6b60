
import React from 'react';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Definieren des Validierungsschemas für die Formularfelder
const formSchema = z.object({
  projectName: z.string().min(1, { message: "Projektname ist erforderlich" }),
  currentProcess: z.string().min(1, { message: "Aktueller Vorgang ist erforderlich" }),
  creator: z.string().min(1, { message: "Ersteller ist erforderlich" }),
  contactInfo: z.string().optional(),
});

export type ProjectDataType = z.infer<typeof formSchema>;

interface ProjectDataFormProps {
  onSubmit: (data: ProjectDataType) => void;
  initialData?: Partial<ProjectDataType>;
  onCancel?: () => void;
}

const ProjectDataForm: React.FC<ProjectDataFormProps> = ({ 
  onSubmit, 
  initialData = {}, 
  onCancel 
}) => {
  const form = useForm<ProjectDataType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: initialData.projectName || "",
      currentProcess: initialData.currentProcess || "",
      creator: initialData.creator || "",
      contactInfo: initialData.contactInfo || "",
    },
  });

  const handleSubmit = (data: ProjectDataType) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="projectName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Projektname</FormLabel>
              <FormControl>
                <Input placeholder="Name des Projekts" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="currentProcess"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aktueller Vorgang</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Dachvermessung" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="creator"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Erstellt von</FormLabel>
              <FormControl>
                <Input placeholder="Name des Erstellers" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kontaktdaten für Rückfragen</FormLabel>
              <FormControl>
                <Textarea placeholder="Telefon, Email, etc." {...field} />
              </FormControl>
              <FormDescription>
                Optional: Kontaktinformationen für eventuelle Rückfragen
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
          <Button type="submit">Speichern</Button>
        </div>
      </form>
    </Form>
  );
};

export default ProjectDataForm;

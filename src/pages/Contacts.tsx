import { Mail, Linkedin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddContactDialog from "@/components/AddContactDialog";
import type { Contact } from "@/types/jobTracker";

interface ContactsProps {
  contacts: Contact[];
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
  onDelete: (id: string) => void;
}

export default function Contacts({ contacts, onAdd, onDelete }: ContactsProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Connections</h1>
          <p className="mt-1 text-muted-foreground">{contacts.length} contacts in your network</p>
        </div>
        <AddContactDialog onAdd={onAdd} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contacts.map(contact => (
          <div key={contact.id} className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground text-sm">
                  {contact.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-semibold">{contact.name}</h3>
                  <p className="text-sm text-muted-foreground">{contact.role}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onDelete(contact.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">{contact.company}</p>
            <div className="mt-3 flex items-center gap-2">
              {contact.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${contact.email}`}><Mail className="h-3.5 w-3.5 mr-1" />Email</a>
                </Button>
              )}
              {contact.linkedin && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer"><Linkedin className="h-3.5 w-3.5 mr-1" />LinkedIn</a>
                </Button>
              )}
            </div>
            {contact.lastContactedAt && (
              <p className="mt-3 text-xs text-muted-foreground">Last contacted: {contact.lastContactedAt}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

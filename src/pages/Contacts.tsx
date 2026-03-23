import { useState } from "react";
import { Mail, Linkedin, Trash2, Users, Building2, Link2, Unlink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddContactDialog from "@/components/AddContactDialog";
import type { Contact, ContactConnection } from "@/types/jobTracker";

interface ContactsProps {
  contacts: Contact[];
  onAdd: (contact: Omit<Contact, "id" | "createdAt">) => void;
  onDelete: (id: string) => void;
  getConnectionsForContact: (contactId: string) => (ContactConnection & { contact?: Contact })[];
  getContactsAtSameOrg: (contactId: string) => Contact[];
  onAddConnection: (contactId1: string, contactId2: string, type?: string) => void;
  onRemoveConnection: (id: string) => void;
}

export default function Contacts({
  contacts, onAdd, onDelete,
  getConnectionsForContact, getContactsAtSameOrg, onAddConnection, onRemoveConnection,
}: ContactsProps) {
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

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
        {contacts.map(contact => {
          const isExpanded = expandedContact === contact.id;
          const connections = getConnectionsForContact(contact.id);
          const sameOrgContacts = getContactsAtSameOrg(contact.id);
          const connectedIds = new Set(connections.map(c => c.contactId1 === contact.id ? c.contactId2 : c.contactId1));
          const availableToConnect = contacts.filter(c => c.id !== contact.id && !connectedIds.has(c.id));

          return (
            <div key={contact.id} className="rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
              <div className="p-5">
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
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedContact(isExpanded ? null : contact.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(contact.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{contact.company}</p>

                {/* Indicators */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sameOrgContacts.length > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Building2 className="h-3 w-3" />{sameOrgContacts.length} at {contact.company}
                    </Badge>
                  )}
                  {connections.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Link2 className="h-3 w-3" />{connections.length} connection{connections.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

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

              {isExpanded && (
                <div className="border-t border-border p-4 space-y-3">
                  {/* Same org contacts */}
                  {sameOrgContacts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Building2 className="h-3 w-3" />Same Organization</p>
                      {sameOrgContacts.map(c => (
                        <div key={c.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm mb-1">
                          <span>{c.name} · {c.role}</span>
                          {!connectedIds.has(c.id) && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onAddConnection(contact.id, c.id, "colleague")}>
                              <Link2 className="h-3 w-3 mr-1" />Link
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Linked connections */}
                  {connections.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1"><Link2 className="h-3 w-3" />Connections</p>
                      {connections.map(conn => (
                        <div key={conn.id} className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span>{conn.contact?.name || "Unknown"}</span>
                            <Badge variant="secondary" className="text-[10px] capitalize">{conn.connectionType}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveConnection(conn.id)}>
                            <Unlink className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add connection */}
                  {availableToConnect.length > 0 && (
                    <Select onValueChange={v => onAddConnection(contact.id, v, "linkedin")}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Add a connection..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableToConnect.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

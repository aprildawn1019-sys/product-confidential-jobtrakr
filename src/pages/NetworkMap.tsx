import { useMemo } from "react";
import { Users, Building2, Link2, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Contact, ContactConnection } from "@/types/jobTracker";

interface NetworkMapProps {
  contacts: Contact[];
  contactConnections: ContactConnection[];
}

export default function NetworkMap({ contacts, contactConnections }: NetworkMapProps) {
  // Group contacts by company
  const orgGroups = useMemo(() => {
    const groups: Record<string, Contact[]> = {};
    contacts.forEach(c => {
      const key = c.company.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups)
      .filter(([, members]) => members.length >= 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [contacts]);

  // Build adjacency from explicit connections
  const adjacency = useMemo(() => {
    const adj: Record<string, Set<string>> = {};
    contactConnections.forEach(cc => {
      if (!adj[cc.contactId1]) adj[cc.contactId1] = new Set();
      if (!adj[cc.contactId2]) adj[cc.contactId2] = new Set();
      adj[cc.contactId1].add(cc.contactId2);
      adj[cc.contactId2].add(cc.contactId1);
    });
    return adj;
  }, [contactConnections]);

  const getConnectionCount = (id: string) => adjacency[id]?.size ?? 0;
  const getConnectionType = (id1: string, id2: string) => {
    return contactConnections.find(
      cc => (cc.contactId1 === id1 && cc.contactId2 === id2) || (cc.contactId1 === id2 && cc.contactId2 === id1)
    )?.connectionType ?? null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Network Map</h1>
        <p className="mt-1 text-muted-foreground">
          {contacts.length} contacts across {orgGroups.length} organizations · {contactConnections.length} connections
        </p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-display text-2xl font-bold">{contacts.length}</p>
          <p className="text-xs text-muted-foreground">Total Contacts</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Building2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-display text-2xl font-bold">{orgGroups.length}</p>
          <p className="text-xs text-muted-foreground">Organizations</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <Link2 className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="font-display text-2xl font-bold">{contactConnections.length}</p>
          <p className="text-xs text-muted-foreground">Connections</p>
        </div>
      </div>

      {/* Organization clusters */}
      <div className="space-y-4">
        {orgGroups.map(([orgKey, members]) => (
          <div key={orgKey} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-display font-semibold text-lg capitalize">{members[0].company}</h3>
              <Badge variant="secondary" className="text-xs">{members.length} contact{members.length > 1 ? "s" : ""}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {members.map(contact => {
                const connCount = getConnectionCount(contact.id);
                // Find connections to other members in this org
                const intraOrgConnections = members
                  .filter(m => m.id !== contact.id)
                  .map(m => ({ contact: m, type: getConnectionType(contact.id, m.id) }))
                  .filter(c => c.type !== null);

                return (
                  <div key={contact.id} className="rounded-lg border border-border p-3 bg-background">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                        {contact.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{contact.role}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {connCount > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          <Link2 className="h-2.5 w-2.5 mr-0.5" />{connCount}
                        </Badge>
                      )}
                      {contact.linkedin && (
                        <a href={`https://${contact.linkedin}`} target="_blank" rel="noopener noreferrer">
                          <Badge variant="outline" className="text-[10px] hover:bg-accent cursor-pointer">
                            <Linkedin className="h-2.5 w-2.5 mr-0.5" />LinkedIn
                          </Badge>
                        </a>
                      )}
                      {intraOrgConnections.map(ic => (
                        <Badge key={ic.contact.id} variant="secondary" className="text-[10px] capitalize">
                          ↔ {ic.contact.name.split(" ")[0]} ({ic.type})
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {orgGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="h-10 w-10 mb-3" />
            <p className="text-lg font-medium">No contacts yet</p>
            <p className="text-sm">Add contacts to see your network map</p>
          </div>
        )}
      </div>
    </div>
  );
}

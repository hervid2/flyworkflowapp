/**
 * Builds a new incident from the create-incident form. Split out of
 * `incidents.service.ts` because that module reads the mock dataset straight
 * off disk (`node:fs`) — a Node built-in that breaks webpack's client bundle
 * when pulled in transitively through this client-only function.
 */
import type { Incident, CreateIncidentDto, Media } from '@/domain/models/incident.model';

/**
 * Simulates POST /incidents.
 * Since there is no backend, this builds and returns a new Incident object.
 * The caller is responsible for adding it to the store (useIssuesStore.addIncident).
 */
export async function createIncident(
  dto: CreateIncidentDto,
  currentUser: Incident['owner'],
  project: Incident['project'],
): Promise<Incident> {
  const now = new Date().toISOString();

  // Turn raw File objects into Media records with local blob URLs for preview.
  const mediaItems: Media[] = dto.media.map((file, i) => ({
    id: `local_${Date.now()}_${i}`,
    name: file.name,
    type: file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'document',
    format: file.name.split('.').pop() ?? '',
    size: file.size,
    status: 'uploaded',
    url: URL.createObjectURL(file),
  }));

  const newIncident: Incident = {
    id: crypto.randomUUID(),
    sequenceId: String(Date.now()).slice(-6),
    order: 0,
    title: dto.title,
    description: dto.description,
    type: dto.type,
    priority: dto.priority,
    status: 'open',
    approval: false,
    project,
    owner: currentUser,
    assignees: dto.assignees,
    observers: dto.observers,
    coordinates: dto.coordinates,
    locationDescription: dto.locationDescription,
    dueDate: dto.dueDate,
    closingDate: null,
    media: mediaItems,
    tags: dto.tags,
    createdAt: now,
    updatedAt: now,
  };

  return newIncident;
}

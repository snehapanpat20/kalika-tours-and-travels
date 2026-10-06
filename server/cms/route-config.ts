import "server-only"
import {
  announcementCreateSchema,
  announcementListSchema,
  announcementUpdateSchema,
  adminListAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncement,
  updateAnnouncement,
} from "@/server/cms/announcements"
import {
  adminListDestinations,
  createDestination,
  deleteDestination,
  destinationCreateSchema,
  destinationListSchema,
  destinationUpdateSchema,
  getDestination,
  updateDestination,
} from "@/server/cms/destinations"
import { contentRoutes } from "@/server/cms/entity-routes"
import { adminListOffers, createOffer, deleteOffer, getOffer, offerCreateSchema, offerListSchema, offerUpdateSchema, updateOffer } from "@/server/cms/offers"
import { adminListServices, createService, deleteService, getService, serviceCreateSchema, serviceListSchema, serviceUpdateSchema, updateService } from "@/server/cms/services"

/** API handlers for each kind of website content; app/api/admin/* re-exports these. */

export const offerRoutes = contentRoutes({
  label: "Offer",
  entityType: "Offer",
  key: "offer",
  body: "multipart",
  permissions: { read: "offers.read", write: "offers.write", delete: "offers.delete" },
  summary: (offer) => offer.title,
  list: { schema: offerListSchema, run: adminListOffers },
  create: { schema: offerCreateSchema, run: createOffer },
  update: {
    schema: offerUpdateSchema,
    run: async (id, input, file) => {
      const { before, offer } = await updateOffer(id, input, file)
      return { before, after: offer }
    },
  },
  remove: deleteOffer,
  get: getOffer,
})

export const announcementRoutes = contentRoutes({
  label: "Announcement",
  entityType: "Announcement",
  key: "announcement",
  body: "json",
  permissions: { read: "announcements.read", write: "announcements.write", delete: "announcements.delete" },
  summary: (item) => item.message,
  list: { schema: announcementListSchema, run: adminListAnnouncements },
  create: { schema: announcementCreateSchema, run: (input) => createAnnouncement(input) },
  update: {
    schema: announcementUpdateSchema,
    run: async (id, input) => {
      const { before, announcement } = await updateAnnouncement(id, input)
      return { before, after: announcement }
    },
  },
  remove: deleteAnnouncement,
  get: getAnnouncement,
})

export const destinationRoutes = contentRoutes({
  label: "Destination",
  entityType: "Destination",
  key: "destination",
  body: "multipart",
  permissions: { read: "destinations.read", write: "destinations.write", delete: "destinations.delete" },
  summary: (item) => item.name,
  list: { schema: destinationListSchema, run: adminListDestinations },
  create: { schema: destinationCreateSchema, run: createDestination },
  update: {
    schema: destinationUpdateSchema,
    run: async (id, input, file) => {
      const { before, destination } = await updateDestination(id, input, file)
      return { before, after: destination }
    },
  },
  remove: deleteDestination,
  get: getDestination,
})

export const serviceRoutes = contentRoutes({
  label: "Service",
  entityType: "Service",
  key: "service",
  body: "multipart",
  permissions: { read: "services.read", write: "services.write", delete: "services.delete" },
  summary: (item) => item.title,
  list: { schema: serviceListSchema, run: adminListServices },
  create: { schema: serviceCreateSchema, run: createService },
  update: {
    schema: serviceUpdateSchema,
    run: async (id, input, file) => {
      const { before, service } = await updateService(id, input, file)
      return { before, after: service }
    },
  },
  remove: deleteService,
  get: getService,
})

import type { Locale } from "@/lib/i18n/locales"
import type {
  ComfortMomentId,
  DestinationId,
  TravellerPhotoId,
  VehicleFeatureKey,
  WhyPointId,
} from "@/types/home"
import type { PageKey } from "@/lib/routes"
import type { PageCtaKey } from "@/data/pageCtas"
import type { FleetPhotoId, VehicleCategory, VehicleId } from "@/data/fleet"
import type { DestinationPlaceId, HeroSlideId, TravelTypeKey, UpcomingTourId } from "@/types/home"
import type { ServiceId, VehicleFeatureId } from "@/types/catalog"

export type Dictionary = {
  meta: {
    siteName: string
    description: string
  }
  tagline: string
  foundation: {
    eyebrow: string
    body: string
  }
  languages: Record<Locale, string>
  languageLabel: string
  nav: {
    label: string
    home: string
    about: string
    services: string
    destinations: string
    traveller: string
    gallery: string
    reviews: string
    contact: string
    plan: string
    whatsapp: string
    call: string
    openMenu: string
    closeMenu: string
  }
  skipToContent: string
  areas: {
    customerTitle: string
    customerBody: string
    adminTitle: string
    adminBody: string
    signedIn: string
    signedOut: string
  }
  services: Record<ServiceId, { name: string; summary: string }>
  vehicle: {
    capacity: string
    features: Record<VehicleFeatureId, string>
  }
  rules: {
    nightTravel: string
    oneWay: string
    noCancellation: string
    noRefund: string
    extras: string
    customPricing: string
    quoteIsEnquiry: string
    bookingIsRequest: string
  }
  /**
   * The closing call-to-action band above the footer, per page
   * (components/sections/page-cta.tsx; layout and links in data/pageCtas.ts).
   * The headline is in three parts so exactly one phrase can be highlighted.
   */
  /** The vehicles (data/fleet.ts): the Our Fleet page and the homepage's "Explore Our Fleet". */
  fleet: {
    /** The About page's photo carousel. */
    carousel: { label: string; previous: string; next: string; pause: string; play: string; counter: string }
    /** Label of the group of filter buttons. */
    filtersLabel: string
    all: string
    categories: Record<VehicleCategory, string>
    /** e.g. "{n} seats". */
    seats: string
    ac: string
    nonAc: string
    /** A vehicle offered both ways. */
    acOrNonAc: string
    sleeper: string
    pushBackOption: string
    photoComingSoon: string
    viewPhotos: string
    viewDetails: string
    onBoard: string
    enquire: string
    /** Announced when a filter changes, e.g. "{n} vehicles shown". */
    shown: string
    vehicles: Record<VehicleId, { name: string; description: string }>
    photos: Record<FleetPhotoId, { alt: string; caption: string }>
    /** The homepage section. */
    home: { eyebrow: string; lead: string; accent: string; description: string; viewAll: string }
  }
  pageCtas: {
    items: Record<PageCtaKey, { lead: string; accent: string; tail: string; subtext: string; primary: string; secondary?: string }>
    /** The small quote form on the Services page's band. */
    quote: { label: string; destination: string; destinationPlaceholder: string; people: string; date: string }
  }
  home: {
    media: {
      pending: string
    }
    /** The homepage's sections (hero, tours, about, Traveller, services, destinations, gallery and reviews, closing call). */
    landing: {
      /** A section heading in three parts: the middle word is set in the handwritten face. */
      hero: {
        /** Prefix of the "Now showing" label, e.g. "Now showing". */
        nowShowing: string
        slides: Record<HeroSlideId, { place: string; alt: string }>
        /** Label of the group of photo buttons. */
        slidesLabel: string
        /** One photo button, e.g. "Show photo {n}: {place}". */
        showSlide: string
        pause: string
        play: string
        /** Secondary link, to the first section below the hero. */
        explore: string
        /** The planning card (no departure dates are published, so it invites an enquiry). */
        card: { eyebrow: string; title: string; body: string; action: string }
        trust: { seats: string; base: string; direct: string; rating: string }
        scroll: string
      }
      tours: { eyebrow: string; lead: string; accent: string; description: string; duration: string; enquire: string; viewAll: string; previous: string; next: string }
      about: { eyebrow: string; title: string; body: string; link: string; stats: { vehicles: string; places: string; trips: string }; photoAlt: string; insetAlt: string }
      services: { eyebrow: string; lead: string; accent: string; description: string; viewAll: string; rental: { title: string; body: string } }
      reviews: { eyebrow: string; lead: string; accent: string; readAll: string; previous: string; next: string; pause: string; play: string }
    }
    hero: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      /** One sentence under the headline saying what we offer. */
      description: string
      /** Label of the destination search box (for screen readers). */
      searchLabel: string
      searchPlaceholder: string
      /** The hero's button, which opens the trip planner. */
      plan: string
      /** Label for the row of journey chips. */
      journeysLabel: string
      imageAlt: string
    }
    journeys: {
      eyebrow: string
      title: string
      description: string
      items: Record<ServiceId, { title: string; body: string; alt: string }>
    }
    services: {
      eyebrow: string
      title: string
      description: string
      items: Record<ServiceId, { title: string; body: string }>
      enquire: string
      unsureTitle: string
      unsureBody: string
      unsureAction: string
    }
    traveller: {
      eyebrow: string
      title: string
      description: string
      seater: string
      capacity: string
      featuresTitle: string
      features: Record<VehicleFeatureKey, string>
      view: string
      plan: string
      imageAlt: string
      gallery: {
        title: string
        description: string
        close: string
        previous: string
        next: string
        counter: string
        items: Record<TravellerPhotoId, { alt: string; caption: string }>
      }
    }
    comfort: {
      eyebrow: string
      title: string
      description: string
      moments: Record<ComfortMomentId, { label: string; body: string; alt: string }>
      space: { label: string; title: string; body: string }
    }
    destinations: {
      eyebrow: string
      title: string
      description: string
      items: Record<DestinationId, { name: string; places: string; alt: string }>
      plan: string
      previous: string
      next: string
      wherever: { title: string; body: string; action: string }
    }
    why: {
      eyebrow: string
      title: string
      description: string
      points: Record<WhyPointId, { title: string; body: string }>
    }
    story: {
      eyebrow: string
      title: string
      description: string
      action: string
      imageAlt: string
    }
    cta: {
      eyebrow: string
      title: string
      description: string
      plan: string
      whatsapp: string
    }
    contact: {
      eyebrow: string
      title: string
      description: string
      call: string
      whatsapp: string
      email: string
      owner: string
      location: string
      instagram: string
      community: string
      communityBody: string
      termsTitle: string
    }
    plan: {
      eyebrow: string
      title: string
      description: string
      name: string
      phone: string
      email: string
      optional: string
      service: string
      servicePlaceholder: string
      destination: string
      destinationHint: string
      departure: string
      return: string
      passengers: string
      passengersHint: string
      /** The "Choose Your Vehicle" field (options come from data/fleet.ts). */
      vehicle: string
      vehiclePlaceholder: string
      vehicleOther: string
      vehicleHint: string
      notes: string
      notesPlaceholder: string
      /** The "round trip" choice. */
      tripType: string
      /** The "one-way" choice. */
      oneWayTrip: string
      /** Label of the round trip / one-way choice. */
      tripKind: string
      submit: string
      submitting: string
      successTitle: string
      successBody: string
      whatsappFollowUp: string
      /** Pre-filled WhatsApp text. Placeholders: {service} {destination} {passengers} {from} {to} {reference} */
      whatsappMessage: string
      sendAnother: string
      errorGeneric: string
      errorRateLimit: string
      errorNetwork: string
      errors: {
        name: string
        nameInvalid: string
        phone: string
        email: string
        serviceId: string
        destination: string
        departureDate: string
        departurePast: string
        departureTooFar: string
        returnDate: string
        returnMissing: string
        passengers: string
        vehicle: string
        notes: string
        notesLinks: string
      }
    }
    footer: {
      description: string
      explore: string
      services: string
      contact: string
      follow: string
      rights: string
      backToTop: string
    }
  }
  pages: {
    meta: Record<PageKey, { title: string; description: string }>
    common: {
      planJourney: string
      planTrip: string
      planThisTrip: string
      planATrip: string
      viewAllServices: string
      viewAllPhotos: string
      readAllReviews: string
      exploreDestinations: string
      meetTheTraveller: string
    }
    about: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      description: string
      imageAlt: string
      storyEyebrow: string
      storyTitle: string
      story: string[]
      storyImageAlt: string
      valuesEyebrow: string
      valuesTitle: string
      values: Record<"people" | "comfort" | "planning" | "care", { title: string; body: string }>
    }
    services: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      description: string
      imageAlt: string
      suitableFor: string
      suitable: Record<ServiceId, string[]>
    }
    destinations: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      description: string
      imageAlt: string
      groups: Record<"maharashtra" | "beyond" | "pilgrimage", { eyebrow: string; title: string; description: string; imageAlt: string }>
      places: Record<DestinationPlaceId, { name: string; description: string }>
      tours: {
        eyebrow: string
        title: string
        description: string
        previous: string
        next: string
        /** Announced when the tour changes, e.g. "Tour {current} of {total}". */
        counter: string
        enquire: string
        items: Record<UpcomingTourId, { name: string; duration: string; description: string }>
      }
      moreTitle: string
      moreBody: string
    }
    traveller: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      description: string
      imageAlt: string
      specsEyebrow: string
      specsTitle: string
      specsBody: string
      seatsValue: string
      seatsLabel: string
      longDistance: string
      perfectForEyebrow: string
      perfectForTitle: string
      perfectFor: Record<ServiceId, string>
      photosEyebrow: string
      photosTitle: string
      photosDescription: string
    }
    gallery: {
      eyebrow: string
      title: string
      description: string
      imageAlt: string
      filterLabel: string
      all: string
      tripTypes: Record<TravelTypeKey, string>
      emptyTitle: string
      emptyBody: string
      emptyFiltered: string
      followInstagram: string
      openPhoto: string
      lightbox: { close: string; previous: string; next: string; counter: string }
    }
    reviews: {
      eyebrow: string
      title: string
      description: string
      imageAlt: string
      emptyTitle: string
      emptyBody: string
      share: string
      shareEyebrow: string
      shareTitle: string
      shareDescription: string
      stars: string
      average: string
      photoAlt: string
      form: {
        name: string
        destination: string
        destinationHint: string
        tripType: string
        tripTypePlaceholder: string
        rating: string
        ratingOption: string
        review: string
        reviewHint: string
        photo: string
        photoHint: string
        photoUnavailable: string
        optional: string
        submit: string
        submitting: string
        successTitle: string
        successBody: string
        another: string
        errors: Record<"name" | "nameInvalid" | "destination" | "rating" | "review" | "reviewLong" | "reviewLinks" | "photo" | "photoSize", string>
        errorGeneric: string
        errorRateLimit: string
        errorNetwork: string
      }
    }
    contact: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      description: string
      imageAlt: string
      planTitle: string
      planBody: string
    }
    plan: {
      eyebrow: string
      titleLead: string
      titleFollow: string
      description: string
      imageAlt: string
      nextTitle: string
      next: string[]
      altTitle: string
      altBody: string
    }
  }
  /** Text for admin-managed content on the public website. */
  cms: {
    announcementClose: string
    learnMore: string
    previewLabel: string
    previewExit: string
    notLiveYet: string
    offers: { eyebrow: string; title: string; description: string; validUntil: string; cta: string }
    moreDetails: string
    photoCredits: string
    destinationCategories: Record<"FAMILY" | "GROUP" | "CORPORATE" | "OUTSTATION", { eyebrow: string; title: string; description: string }>
  }
  /** Breadcrumbs, destination pages, FAQs and 404 links. */
  seo: {
    breadcrumbLabel: string
    destination: {
      eyebrow: string
      aboutTitle: string
      planTitle: string
      planBody: string
      planAction: string
      servicesTitle: string
      backToAll: string
      moreTitle: string
    }
    faq: {
      eyebrow: string
      title: string
      questions: Record<
        | "night"
        | "oneWay"
        | "price"
        | "kinds"
        | "book"
        | "cancel"
        | "quote"
        | "fleetTypes"
        | "groupSize"
        | "acNonAc"
        | "sleeper"
        | "tripKinds"
        | "availability"
        | "specificVehicle",
        string
      >
      /** `fleetTypes` has a {vehicles} placeholder, filled from data/fleet.ts. */
      answers: Record<"kinds" | "book" | "fleetTypes" | "groupSize" | "acNonAc" | "sleeper" | "tripKinds" | "availability" | "specificVehicle", string>
    }
    notFoundLinks: string
  }
  errors: {
    notFoundTitle: string
    notFoundBody: string
    backHome: string
    unexpected: string
    retry: string
  }
}

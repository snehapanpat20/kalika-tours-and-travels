export type AnalyticsEvent = {
  name: string
  properties?: Record<string, string | number | boolean>
}

export function track(event: AnalyticsEvent): void {
  if (!process.env.NEXT_PUBLIC_ANALYTICS_ID) return
  void event
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * A chosen file plus a blob: URL to preview it. The URL is created when the
 * file is chosen and released when it is replaced or the component unmounts.
 */
export function useFilePreview() {
  const [file, setFileState] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const current = useRef<string | null>(null)

  const setFile = useCallback((next: File | null) => {
    if (current.current) URL.revokeObjectURL(current.current)
    current.current = next ? URL.createObjectURL(next) : null
    setPreview(current.current)
    setFileState(next)
  }, [])

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current)
    },
    [],
  )

  return { file, preview, setFile }
}

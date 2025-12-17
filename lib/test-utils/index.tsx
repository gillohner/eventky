/**
 * Test Utilities for Eventky
 * 
 * This module provides helpers for testing React components and hooks
 */

import { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Create a fresh QueryClient for testing
 * Disables retries and caching to make tests predictable
 */
export function createTestQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
                staleTime: 0,
            },
            mutations: {
                retry: false,
            },
        },
    })
}

interface WrapperProps {
    children: ReactNode
}

/**
 * Create a wrapper component with all providers for testing
 */
export function createWrapper() {
    const queryClient = createTestQueryClient()

    return function Wrapper({ children }: WrapperProps) {
        return (
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        )
    }
}

/**
 * Custom render function that includes all providers
 */
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { wrapper: createWrapper(), ...options })
}

export * from '@testing-library/react'
export { renderWithProviders as render }

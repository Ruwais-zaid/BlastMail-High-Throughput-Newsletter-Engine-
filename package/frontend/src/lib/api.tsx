const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

export interface Subscriber {
  id: number
  email: string
  status: 'subscribed' | 'unsubscribed'
  createdAt: string
}

export interface Campaign {
  id: number
  subject: string
  success: boolean
  message: string
  body_html: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
  scheduled_at: string | null
  created_at: string
  updated_at: string
}

export interface ApiResponse<T> {
  data: T
  pagination?: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface UploadSubscriberResponse {
  success: boolean
  message: string
  stats: {
    totalRows: number
    validEmail: number
    duplicateEmail: number
    inserted: number
    invalidEmail: number
  }
}

export interface CreateCampaignPayload {
  subject: string
  body_html: string
  scheduled_at?: string | null
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers as Record<string, string> | undefined),
      },
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(`API Error ${response.status}: ${message || response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  private async requestWrapped<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, options)
  }

  // Subscriber methods
  getSubscribers(limit = 100, offset = 0): Promise<ApiResponse<Subscriber[]>> {
    return this.requestWrapped<Subscriber[]>(`/subscribers?limit=${limit}&offset=${offset}`)
  }

  async uploadSubscriber(file: File): Promise<UploadSubscriberResponse> {
    const formData = new FormData()
    formData.append('file', file)

    // Fix MIME type if needed
    if (file.type !== 'text/csv' && file.name.endsWith('.csv')) {
      const correctFile = new File([file], file.name, { type: 'text/csv' })
      formData.set('file', correctFile)
    }

    return this.request<UploadSubscriberResponse>('/subscribers/upload', {
      method: 'POST',
      body: formData,
    })
  }

  deleteSubscriber(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/subscribers/${id}`, { method: 'DELETE' })
  }
  getCampaigns(limit = 50, offset = 0): Promise<ApiResponse<Campaign[]>> {
    return this.requestWrapped<Campaign[]>(`/campaign?limit=${limit}&offset=${offset}`)
  }

  getCampaignById(id: number): Promise<ApiResponse<Campaign>> {
    return this.requestWrapped<Campaign>(`/campaign/${id}`)
  }

  createCampaign(payload: CreateCampaignPayload): Promise<ApiResponse<Campaign>> {
    return this.requestWrapped<Campaign>('/campaign', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  updateCampaign(id: number, data: Partial<Campaign>): Promise<ApiResponse<Campaign>> {
    return this.requestWrapped<Campaign>(`/campaign/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  deleteCampaignById(id: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.requestWrapped<{ success: boolean }>(`/campaign/${id}`, {
      method: 'DELETE',
    })
  }

  getDashboardStats(): Promise<{
    totalSubscribers: number
    activeSubscribers: number
    totalCampaigns: number
    sentToday: number
    avgOpenRate: number
    avgClickRate: number
  }> {
    return this.request('/analytics/dashboard')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { ArrowLeft, Save, Calendar, Mail, Clock, AlertCircle } from 'lucide-react'

dayjs.extend(utc)
dayjs.extend(timezone)

export function NewCampaignPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    subject: '',
    body_html: '',
    scheduled_at: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const INDIAN_TIMEZONE = 'Asia/Kolkata'
  const utcToIndianDateTimeLocal = (utcIsoString: string): string => {
    if (!utcIsoString) return ''
    try {
      const indianTime = dayjs.utc(utcIsoString).tz(INDIAN_TIMEZONE)
      if (!indianTime.isValid()) return ''
      return indianTime.format('YYYY-MM-DDTHH:mm')
    } catch (error) {
      console.error('Error converting UTC to Indian datetime-local:', error)
      return ''
    }
  }
  const indianDateTimeLocalToUTC = (indianDateTimeLocal: string): string => {
    if (!indianDateTimeLocal) return ''
    try {
      const indianTime = dayjs.tz(indianDateTimeLocal, INDIAN_TIMEZONE)
      if (!indianTime.isValid()) return ''
      return indianTime.utc().toISOString()
    } catch (error) {
      console.error('Error converting Indian datetime-local to UTC:', error)
      return ''
    }
  }
  const getCurrentIndianTime = () => {
    return dayjs().tz(INDIAN_TIMEZONE)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === 'scheduled_at') {
      const utcIsoString = indianDateTimeLocalToUTC(value)
      setFormData(prev => ({
        ...prev,
        scheduled_at: utcIsoString,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim()) {
      setError('Subject is required')
      return
    }

    if (!formData.body_html.trim()) {
      setError('Email body is required')
      return
    }

    if (!formData.scheduled_at) {
      setError('Please select a schedule time')
      return
    }

    const scheduledDateUTC = dayjs.utc(formData.scheduled_at)
    const nowUTC = dayjs.utc()

    if (!scheduledDateUTC.isValid() || scheduledDateUTC.isBefore(nowUTC)) {
      setError('Schedule time must be in the future (at least 1 minute from now)')
      return
    }

    try {
      setSaving(true)
      setError(null)

      const campaignData = {
        subject: formData.subject,
        body_html: formData.body_html,
        scheduled_at: formData.scheduled_at,
      }
      // console.log('Request body to be sent:', {
      //   ...campaignData,
      //   scheduled_at_type: typeof campaignData.scheduled_at,
      //   scheduled_at_value: campaignData.scheduled_at,
      //   is_valid_iso: dayjs(campaignData.scheduled_at).isValid(),
      //   utc_timestamp: campaignData.scheduled_at,
      //   indian_time_equivalent: dayjs.utc(campaignData.scheduled_at).tz(INDIAN_TIMEZONE).format('YYYY-MM-DD HH:mm:ss')
      // })

      const response = await apiClient.createCampaign(campaignData)

      if (response.data) {
        alert('Campaign scheduled successfully!')
        navigate('/campaigns')
      } else {
        setError('Failed to schedule campaign')
      }
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to schedule campaign')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDraft = async () => {
    if (!formData.subject.trim()) {
      setFormData(prev => ({ ...prev, subject: 'Untitled Campaign' }))
    }

    try {
      setSaving(true)
      setError(null)
      const thirtyDaysLaterIndian = getCurrentIndianTime().add(30, 'day')
      const utcDate = thirtyDaysLaterIndian.utc().toISOString()

      const campaignData = {
        subject: formData.subject || 'Untitled Campaign',
        body_html: formData.body_html || '<p>Empty draft</p>',
        scheduled_at: utcDate,
      }

      // console.log('Draft request body:', {
      //   ...campaignData,
      //   scheduled_at_type: typeof campaignData.scheduled_at,
      //   is_valid_iso: dayjs(campaignData.scheduled_at).isValid()
      // })

      const response = await apiClient.createCampaign(campaignData)

      if (response.data) {
        alert('Draft saved successfully!')
        navigate('/campaigns')
      } else {
        setError('Failed to save draft')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const quickScheduleOptions = [
    {
      label: 'In 2 minutes',
      getDate: () => {
        return getCurrentIndianTime().add(2, 'minute').second(0).millisecond(0)
      },
    },
    {
      label: 'In 15 minutes',
      getDate: () => {
        return getCurrentIndianTime().add(15, 'minute').second(0).millisecond(0)
      },
    },
    {
      label: 'In 1 hour',
      getDate: () => {
        return getCurrentIndianTime().add(1, 'hour').minute(0).second(0).millisecond(0)
      },
    },
    {
      label: 'Tomorrow 9 AM',
      getDate: () => {
        return getCurrentIndianTime().add(1, 'day').hour(9).minute(0).second(0).millisecond(0)
      },
    },
    {
      label: 'Next Monday 10 AM',
      getDate: () => {
        const nextMonday = getCurrentIndianTime().day(8)
        if (nextMonday.isBefore(getCurrentIndianTime())) {
          nextMonday.add(1, 'week')
        }
        return nextMonday.hour(10).minute(0).second(0).millisecond(0)
      },
    },
    {
      label: 'End of Day Today (5 PM)',
      getDate: () => {
        const today = getCurrentIndianTime()
        const endOfDay = today.hour(17).minute(0).second(0).millisecond(0)

        if (endOfDay.isBefore(today)) {
          return today.add(1, 'day').hour(17).minute(0).second(0).millisecond(0)
        }
        return endOfDay
      },
    },
  ]

  const handleQuickSchedule = (option: (typeof quickScheduleOptions)[0]) => {
    try {
      const indianDate = option.getDate()
      if (indianDate.isValid()) {
        const utcDate = indianDate.utc().toISOString()
        setFormData(prev => ({
          ...prev,
          scheduled_at: utcDate,
        }))
      }
    } catch (error) {
      setError('Failed to set schedule time')
      console.error('Error setting quick schedule:', error)
    }
  }

  const getDisplayDate = () => {
    if (!formData.scheduled_at) return 'Not set'

    try {
      const indianTime = dayjs.utc(formData.scheduled_at).tz(INDIAN_TIMEZONE)
      if (!indianTime.isValid()) return 'Invalid date'

      const nowIndian = getCurrentIndianTime()
      const diffMinutes = indianTime.diff(nowIndian, 'minute')

      if (diffMinutes <= 5) {
        return `In ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} (${indianTime.format('h:mm A')})`
      } else if (diffMinutes <= 60) {
        return `In ${diffMinutes} minutes (${indianTime.format('h:mm A')})`
      } else if (indianTime.isSame(nowIndian, 'day')) {
        return `Today at ${indianTime.format('h:mm A')}`
      } else if (indianTime.isSame(nowIndian.add(1, 'day'), 'day')) {
        return `Tomorrow at ${indianTime.format('h:mm A')}`
      } else {
        return indianTime.format('MMM D, YYYY h:mm A')
      }
    } catch {
      return 'Invalid date'
    }
  }
  const getMinDateTimeLocal = () => {
    const oneMinuteFromNow = getCurrentIndianTime().add(1, 'minute')
    return oneMinuteFromNow.format('YYYY-MM-DDTHH:mm')
  }
  useEffect(() => {
    const defaultIndianDate = getCurrentIndianTime().add(2, 'minute').second(0).millisecond(0)
    const defaultUTCDate = defaultIndianDate.utc().toISOString()

    setFormData(prev => ({
      ...prev,
      scheduled_at: defaultUTCDate,
    }))
  }, [])

  const getUTCString = () => {
    if (!formData.scheduled_at) return 'Not set'
    try {
      return dayjs.utc(formData.scheduled_at).format('YYYY-MM-DD HH:mm:ss') + ' UTC'
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <button
            onClick={() => navigate('/campaigns')}
            className='flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2'
          >
            <ArrowLeft className='w-4 h-4' />
            Back to Campaigns
          </button>
          <h1 className='text-2xl font-bold text-gray-900'>Create New Campaign</h1>
          <p className='text-gray-600 mt-1'>
            Schedule your email blast for the future (All times displayed in IST)
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 mt-0.5 flex-shrink-0' />
          <div>
            <p className='font-medium'>Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column - Form */}
        <div className='lg:col-span-2'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {/* Subject */}
            <div className='bg-white p-6 rounded-lg border border-gray-200'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Subject Line *</label>
              <input
                type='text'
                name='subject'
                value={formData.subject}
                onChange={handleChange}
                placeholder='Enter email subject that will get people to open...'
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                required
              />
              <div className='flex items-center gap-4 mt-3'>
                <div className='flex items-center gap-2'>
                  <Mail className='w-4 h-4 text-gray-400' />
                  <span className='text-sm text-gray-600'>
                    Preview:{' '}
                    <span className='font-medium'>
                      {formData.subject || 'Your subject will appear here'}
                    </span>
                  </span>
                </div>
                <div className='text-sm text-gray-500'>
                  {formData.subject.length}/100 characters
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className='bg-white p-6 rounded-lg border border-gray-200'>
              <div className='flex items-center justify-between mb-2'>
                <label className='block text-sm font-medium text-gray-700'>
                  Email Body (HTML) *
                </label>
                <button
                  type='button'
                  onClick={() =>
                    setFormData(prev => ({
                      ...prev,
                      body_html: prev.body_html + '<p>New paragraph</p>',
                    }))
                  }
                  className='text-sm text-blue-600 hover:text-blue-800'
                >
                  + Add Paragraph
                </button>
              </div>
              <textarea
                name='body_html'
                value={formData.body_html}
                onChange={handleChange}
                placeholder='<p>Hello [Name],</p>
<p>Your email content here...</p>
<p>Best regards,<br/>Your Team</p>'
                rows={15}
                className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm'
                required
              />
            </div>

            {/* Schedule Section */}
            <div className='bg-white p-6 rounded-lg border border-gray-200'>
              <div className='mb-4'>
                <h3 className='text-lg font-medium text-gray-900'>Schedule</h3>
                <p className='text-sm text-gray-600'>
                  When should this campaign be sent? Times are in IST and will be stored as UTC in
                  database.
                </p>
              </div>

              <div className='space-y-6'>
                {/* Quick Schedule Options */}
                <div>
                  <h4 className='text-sm font-medium text-gray-700 mb-3'>Quick Schedule</h4>
                  <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2'>
                    {quickScheduleOptions.map((option, index) => (
                      <button
                        key={index}
                        type='button'
                        onClick={() => handleQuickSchedule(option)}
                        className='px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors'
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date/Time */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Custom Date & Time (IST)
                  </label>
                  <div className='flex items-center gap-4'>
                    <input
                      type='datetime-local'
                      name='scheduled_at'
                      value={utcToIndianDateTimeLocal(formData.scheduled_at)}
                      onChange={handleChange}
                      min={getMinDateTimeLocal()}
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      required
                    />
                    <Clock className='w-5 h-5 text-gray-400' />
                  </div>
                  <p className='text-xs text-gray-500 mt-1'>
                    Must be at least 1 minute from now (IST)
                  </p>
                </div>

                {/* Schedule Preview */}
                <div className='p-4 bg-blue-50 rounded-lg border border-blue-100'>
                  <div className='flex items-center gap-3'>
                    <Calendar className='w-5 h-5 text-blue-600' />
                    <div>
                      <p className='text-sm font-medium text-blue-900'>
                        Scheduled for (IST): {getDisplayDate()}
                      </p>
                      <p className='text-sm text-blue-700 mt-1'>
                        Will be stored in database as (UTC): {getUTCString()}
                      </p>
                      <p className='text-xs text-blue-600 mt-1'>
                        Request body ISO: {formData.scheduled_at || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column - Actions & Preview */}
        <div className='space-y-6'>
          {/* Actions Card */}
          <div className='bg-white p-6 rounded-lg border border-gray-200'>
            <h3 className='text-lg font-medium text-gray-900 mb-4'>Actions</h3>

            <div className='space-y-3'>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Save className='w-4 h-4' />
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>

              <button
                onClick={handleSubmit}
                disabled={
                  saving ||
                  !formData.subject.trim() ||
                  !formData.body_html.trim() ||
                  !formData.scheduled_at
                }
                className='w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <Calendar className='w-4 h-4' />
                {saving ? 'Scheduling...' : 'Schedule Campaign'}
              </button>

              <button
                onClick={() => navigate('/campaigns')}
                className='w-full px-4 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
            </div>

            <div className='mt-6 pt-6 border-t border-gray-200'>
              <h4 className='text-sm font-medium text-gray-700 mb-2'>Time Information</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Display Time (IST):</span>
                  <span className='font-medium'>{getDisplayDate()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Database Time (UTC):</span>
                  <span className='font-medium text-green-700'>{getUTCString()}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>ISO String:</span>
                  <span className='font-mono text-xs break-all text-gray-500'>
                    {formData.scheduled_at
                      ? formData.scheduled_at.substring(0, 20) + '...'
                      : 'Not set'}
                  </span>
                </div>
                <div className='mt-4 p-2 bg-gray-50 rounded border border-gray-200'>
                  <p className='text-xs text-gray-600 mb-1'>Request Body Preview:</p>
                  <pre className='text-xs bg-gray-900 text-gray-300 p-2 rounded overflow-auto max-h-24'>
                    {JSON.stringify(
                      {
                        subject: formData.subject || 'Not set',
                        body_html: formData.body_html
                          ? `${formData.body_html.substring(0, 30)}...`
                          : 'Not set',
                        scheduled_at: formData.scheduled_at || 'Not set',
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewCampaignPage

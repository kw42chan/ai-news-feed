import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HomeFeed } from './components/HomeFeed'
import { WeeklyPage } from './components/WeeklyPage'
import { SavedFeed } from './components/SavedFeed'
import { StoryPage } from './components/StoryPage'
import { fetchLatestWeeklyRecap } from './lib/feed'
import { useAppRoute } from './lib/routing'
import { Analytics } from '@vercel/analytics/react'

function App() {
  const route = useAppRoute()
  const [hasWeeklyRecap, setHasWeeklyRecap] = useState(false)

  useEffect(() => {
    fetchLatestWeeklyRecap()
      .then((recap) => setHasWeeklyRecap(!!recap))
      .catch(() => setHasWeeklyRecap(false))
  }, [])

  useEffect(() => {
    if (route.name === 'story') return
    if (route.name === 'weekly') {
      document.title = 'This week in AI — AI News, Minus the Noise'
    } else if (route.name === 'saved') {
      document.title = 'Saved stories — AI News, Minus the Noise'
    } else {
      document.title = 'AI News, Minus the Noise'
    }
  }, [route])

  return (
    <div className="min-h-screen bg-mist flex flex-col">
      <Header hasWeeklyRecap={hasWeeklyRecap} />
      <div className="flex-1 w-full">
        {route.name === 'home' && <HomeFeed hasWeeklyRecap={hasWeeklyRecap} />}
        {route.name === 'weekly' && (
          <div className="max-w-[800px] mx-auto px-6 max-sm:px-4">
            <WeeklyPage />
          </div>
        )}
        {route.name === 'saved' && <SavedFeed />}
        {route.name === 'story' && (
          <div className="max-w-[800px] mx-auto px-6 max-sm:px-4">
            <StoryPage id={route.id} />
          </div>
        )}
      </div>
      <Footer hasWeeklyRecap={hasWeeklyRecap} />
      <Analytics />
    </div>
  )
}

export default App

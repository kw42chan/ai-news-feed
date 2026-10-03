import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { HomeFeed } from './components/HomeFeed'
import { WeeklyPage } from './components/WeeklyPage'
import { SavedFeed } from './components/SavedFeed'
import { StoryPage } from './components/StoryPage'
import { fetchLatestWeeklyRecap } from './lib/feed'
import { useAppRoute } from './lib/routing'

function App() {
  const route = useAppRoute()
  const [hasWeeklyRecap, setHasWeeklyRecap] = useState(false)

  useEffect(() => {
    fetchLatestWeeklyRecap()
      .then((recap) => setHasWeeklyRecap(!!recap))
      .catch(() => setHasWeeklyRecap(false))
  }, [])

  useEffect(() => {
    if (route.name === 'story' && route.id) {
      document.title = 'AI News story'
    } else if (route.name === 'weekly') {
      document.title = 'This week in AI — AI News, Minus the Noise'
    } else if (route.name === 'saved') {
      document.title = 'Saved stories — AI News, Minus the Noise'
    } else {
      document.title = 'AI News, Minus the Noise'
    }
  }, [route])

  return (
    <div className="min-h-screen bg-mist">
      <Header hasWeeklyRecap={hasWeeklyRecap} />
      {route.name === 'home' && <HomeFeed />}
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
      <Footer />
    </div>
  )
}

export default App

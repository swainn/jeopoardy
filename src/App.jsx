import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppBar,
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Slider,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import './App.css'

const buildQuestionId = (categoryIndex, questionIndex) =>
  `c${categoryIndex}-q${questionIndex}`

function App() {
  const [colorMode, setColorMode] = useState('dark')
  const [gameData, setGameData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [answeredMap, setAnsweredMap] = useState({})
  const [teams, setTeams] = useState([])
  const [activeTeamIndex, setActiveTeamIndex] = useState(0)
  const [teamCount, setTeamCount] = useState(2)
  const [showTeamSetup, setShowTeamSetup] = useState(true)
  const [wagersByQuestion, setWagersByQuestion] = useState({})
  const [showFinalIntro, setShowFinalIntro] = useState(false)
  const [finalResultsByTeam, setFinalResultsByTeam] = useState({})
  const [showFinalStandings, setShowFinalStandings] = useState(false)
  const [dailyDoubleMap, setDailyDoubleMap] = useState({})
  const [showDailyDoubleIntro, setShowDailyDoubleIntro] = useState(false)
  const [pendingDailyDouble, setPendingDailyDouble] = useState(null)
  const [showDailyDoubleMarkers, setShowDailyDoubleMarkers] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundVolume, setSoundVolume] = useState(0.6)
  const [pendingFinalOpen, setPendingFinalOpen] = useState(false)
  const audioContextRef = useRef(null)
  const themeSongRef = useRef(null)
  const correctSoundRef = useRef(null)
  const incorrectSoundRef = useRef(null)
  const dailyDoubleSoundRef = useRef(null)
  const finalSoundRef = useRef(null)
  const finalOpenTimeoutRef = useRef(null)

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: colorMode,
          primary: {
            main: '#1565c0',
          },
          secondary: {
            main: '#ffb300',
          },
          background: {
            default: colorMode === 'dark' ? '#0b1220' : '#f3f6fb',
            paper: colorMode === 'dark' ? '#111a2b' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        },
      }),
    [colorMode],
  )

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/questions.json')
        if (!response.ok) {
          throw new Error('Unable to load questions.json')
        }
        const data = await response.json()
        if (active) {
          setGameData(data)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err?.message || 'Unable to load questions')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!event.ctrlKey || !event.shiftKey) return
      const key = event.key.toLowerCase()
      if (key !== 'j' && key !== 'd') return
      if (!gameData?.categories?.length) return

      if (key === 'd') {
        setShowDailyDoubleMarkers((prev) => !prev)
        return
      }

      const questionIds = []
      gameData.categories.forEach((category, categoryIndex) => {
        category.questions.forEach((_, questionIndex) => {
          questionIds.push(buildQuestionId(categoryIndex, questionIndex))
        })
      })

      if (questionIds.length === 0) return
      const remainingId = questionIds[questionIds.length - 1]
      const nextAnswered = questionIds.reduce((acc, id) => {
        if (id !== remainingId) acc[id] = true
        return acc
      }, {})

      setAnsweredMap(nextAnswered)
      setSelected(null)
      setRevealAnswer(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameData])

  const ensureAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  const playTone = ({ frequency, duration = 0.15, type = 'sine', gain = 0.12 }) => {
    if (!soundEnabled) return
    const ctx = ensureAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gainNode.gain.value = gain * soundVolume
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    oscillator.start()
    oscillator.stop(ctx.currentTime + duration)
  }

  const playSequence = (sequence) => {
    if (!soundEnabled) return
    const ctx = ensureAudioContext()
    let currentTime = ctx.currentTime
    sequence.forEach(({ frequency, duration = 0.15, type = 'sine', gain = 0.12 }) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      gainNode.gain.value = gain * soundVolume
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start(currentTime)
      oscillator.stop(currentTime + duration)
      currentTime += duration + 0.02
    })
  }

  const playSound = (type) => {
    if (!soundEnabled) return
    switch (type) {
      case 'select':
        playTone({ frequency: 440, duration: 0.08, gain: 0.1 })
        break
      case 'reveal':
        playTone({ frequency: 660, duration: 0.12, gain: 0.12 })
        break
      case 'correct':
        if (!correctSoundRef.current) {
          correctSoundRef.current = new Audio('/correct.mp3')
        }
        correctSoundRef.current.volume = soundEnabled ? soundVolume : 0
        correctSoundRef.current.currentTime = 0
        correctSoundRef.current.play().catch(() => {})
        break
      case 'incorrect':
        if (!incorrectSoundRef.current) {
          incorrectSoundRef.current = new Audio('/incorrect.mp3')
        }
        incorrectSoundRef.current.volume = soundEnabled ? soundVolume : 0
        incorrectSoundRef.current.playbackRate = 2.0
        incorrectSoundRef.current.currentTime = 0
        incorrectSoundRef.current.play().catch(() => {})
        break
      case 'dailyDouble':
        if (!dailyDoubleSoundRef.current) {
          dailyDoubleSoundRef.current = new Audio('/double.mp3')
        }
        dailyDoubleSoundRef.current.volume = soundEnabled ? soundVolume : 0
        dailyDoubleSoundRef.current.currentTime = 0
        dailyDoubleSoundRef.current.play().catch(() => {})
        break
      case 'finalIntro':
        if (!finalSoundRef.current) {
          finalSoundRef.current = new Audio('/final.mp3')
        }
        finalSoundRef.current.volume = soundEnabled ? soundVolume : 0
        finalSoundRef.current.currentTime = 0
        finalSoundRef.current.play().catch(() => {})
        break
      case 'gameEnd':
        playSequence([
          { frequency: 523, duration: 0.12, gain: 0.12 },
          { frequency: 659, duration: 0.12, gain: 0.12 },
          { frequency: 784, duration: 0.16, gain: 0.12 },
          { frequency: 988, duration: 0.18, gain: 0.12 },
        ])
        break
      default:
        break
    }
  }

  const maxQuestions = useMemo(() => {
    if (!gameData?.categories?.length) return 0
    return Math.max(
      ...gameData.categories.map((category) => category.questions.length),
    )
  }, [gameData])

  const totalQuestions = useMemo(() => {
    if (!gameData?.categories?.length) return 0
    return gameData.categories.reduce(
      (sum, category) => sum + category.questions.length,
      0,
    )
  }, [gameData])

  const handleOpenQuestion = (payload) => {
    setSelected(payload)
    setRevealAnswer(false)
  }

  const isDailyDoubleQuestion = (categoryIndex, questionIndex) =>
    Boolean(dailyDoubleMap[buildQuestionId(categoryIndex, questionIndex)])

  const handleSelectQuestion = (payload) => {
    playSound('select')
    if (payload?.isFinal) {
      handleOpenQuestion(payload)
      return
    }
    if (payload?.categoryIndex == null || payload?.questionIndex == null) {
      handleOpenQuestion(payload)
      return
    }
    if (isDailyDoubleQuestion(payload.categoryIndex, payload.questionIndex)) {
      setPendingDailyDouble(payload)
      setShowDailyDoubleIntro(true)
      return
    }
    handleOpenQuestion(payload)
  }

  useEffect(() => {
    if (!gameData?.finalJeopardy) return
    if (showTeamSetup) return
    if (selected) return
    if (showFinalIntro) return
    if (answeredMap.final) return
    const answeredCount = Object.keys(answeredMap).filter(
      (key) => key !== 'final',
    ).length
    if (totalQuestions > 0 && answeredCount >= totalQuestions) {
      setPendingFinalOpen(true)
    }
  }, [
    answeredMap,
    gameData,
    selected,
    showFinalIntro,
    showTeamSetup,
    totalQuestions,
  ])

  useEffect(() => {
    if (showDailyDoubleIntro) playSound('dailyDouble')
  }, [showDailyDoubleIntro])

  useEffect(() => {
    if (showFinalIntro) playSound('finalIntro')
  }, [showFinalIntro])

  useEffect(() => {
    if (showFinalStandings) playSound('gameEnd')
  }, [showFinalStandings])

  useEffect(() => {
    if (showFinalStandings) playSound('finalIntro')
  }, [showFinalStandings])

  useEffect(() => {
    if (!pendingFinalOpen) return
    if (!gameData?.finalJeopardy) return
    if (finalOpenTimeoutRef.current) {
      clearTimeout(finalOpenTimeoutRef.current)
    }
    finalOpenTimeoutRef.current = setTimeout(() => {
      setShowFinalIntro(true)
      finalOpenTimeoutRef.current = null
      setPendingFinalOpen(false)
    }, 3000)
    return () => {
      if (finalOpenTimeoutRef.current) {
        clearTimeout(finalOpenTimeoutRef.current)
        finalOpenTimeoutRef.current = null
      }
    }
  }, [gameData, pendingFinalOpen])

  const handleCloseDialog = () => {
    setSelected(null)
    setRevealAnswer(false)
    if (themeSongRef.current) {
      themeSongRef.current.pause()
      themeSongRef.current.currentTime = 0
    }
  }

  const handleCloseFinalStandings = () => {
    setShowFinalStandings(false)
  }

  const handleMarkAnswered = () => {
    if (!selected) return
    const id = selected.id
    setAnsweredMap((prev) => ({
      ...prev,
      [id]: true,
    }))
    if (id === 'final') {
      setFinalResultsByTeam({})
      setShowFinalStandings(true)
    }
    handleCloseDialog()
  }

  const handleReset = () => {
    setAnsweredMap({})
    setSelected(null)
    setRevealAnswer(false)
    setWagersByQuestion({})
    setActiveTeamIndex(0)
    setShowTeamSetup(true)
    setShowFinalIntro(false)
    setFinalResultsByTeam({})
    setShowFinalStandings(false)
    setDailyDoubleMap({})
    setShowDailyDoubleIntro(false)
    setPendingDailyDouble(null)
    setPendingFinalOpen(false)
    if (finalOpenTimeoutRef.current) {
      clearTimeout(finalOpenTimeoutRef.current)
      finalOpenTimeoutRef.current = null
    }
  }

  const handleCreateTeams = () => {
    const nextTeams = Array.from({ length: teamCount }, (_, index) => ({
      id: `team-${index + 1}`,
      name: `Team ${index + 1}`,
      score: 0,
    }))
    setTeams(nextTeams)
    setActiveTeamIndex(0)
    setShowTeamSetup(false)
    if (gameData?.categories?.length) {
      const nextDailyDoubleMap = {}
      gameData.categories.forEach((category, categoryIndex) => {
        if (!category.questions.length) return
        const randomIndex = Math.floor(
          Math.random() * category.questions.length,
        )
        nextDailyDoubleMap[buildQuestionId(categoryIndex, randomIndex)] = true
      })
      setDailyDoubleMap(nextDailyDoubleMap)
    }
  }

  const handleOpenFinalJeopardy = () => {
    if (!gameData?.finalJeopardy) return
    setShowFinalIntro(false)
    setFinalResultsByTeam({})
    setShowFinalStandings(false)
    handleSelectQuestion({
      id: 'final',
      question: gameData.finalJeopardy,
      category: { name: gameData.finalJeopardy.category },
      isFinal: true,
    })
  }

  const handleOpenDailyDoubleQuestion = () => {
    if (!pendingDailyDouble) return
    setShowDailyDoubleIntro(false)
    handleOpenQuestion(pendingDailyDouble)
    setPendingDailyDouble(null)
  }

  const handleRevealAnswer = () => {
    setRevealAnswer(true)
    if (themeSongRef.current) {
      themeSongRef.current.pause()
      themeSongRef.current.currentTime = 0
    }
    playSound('reveal')
  }

  useEffect(() => {
    if (!selected || revealAnswer) return
    if (!themeSongRef.current) {
      themeSongRef.current = new Audio('/Jeopardy-theme-song.mp3')
      themeSongRef.current.loop = true
    }
    themeSongRef.current.volume = soundEnabled ? soundVolume : 0
    themeSongRef.current.play().catch(() => {})
    return () => {
      if (themeSongRef.current) {
        themeSongRef.current.pause()
        themeSongRef.current.currentTime = 0
      }
    }
  }, [selected, revealAnswer, soundEnabled, soundVolume])

  const handleToggleTheme = () => {
    setColorMode((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleSwitchTeam = () => {
    setActiveTeamIndex((prev) => (prev + 1) % teams.length)
  }

  const applyScoreDelta = (delta) => {
    setTeams((prev) =>
      prev.map((team, index) =>
        index === activeTeamIndex
          ? { ...team, score: Math.max(0, team.score + delta) }
          : team,
      ),
    )
  }

  const applyScoreDeltaForTeam = (teamId, delta) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId
          ? { ...team, score: Math.max(0, team.score + delta) }
          : team,
      ),
    )
  }

  const handleScoreCorrect = () => {
    if (!selectedQuestion?.value) return
    applyScoreDelta(scoreValue)
    playSound('correct')
    handleMarkAnswered()
  }

  const handleScoreIncorrect = () => {
    if (!selectedQuestion?.value) return
    applyScoreDelta(-scoreValue)
    playSound('incorrect')
    handleSwitchTeam()
    handleMarkAnswered()
  }

  const handleNoCorrectResponse = () => {
    playSound('incorrect')
    handleMarkAnswered()
  }

  const selectedQuestion = selected?.question
  const selectedCategory = selected?.category
  const activeTeam = teams[activeTeamIndex]
  const canScore = Boolean(selectedQuestion?.value)
  const selectedQuestionId = selected?.id
  const isDailyDouble = Boolean(
    selectedQuestionId && dailyDoubleMap[selectedQuestionId],
  )
  const isFinalJeopardy = Boolean(selected?.isFinal)
  const wagersForQuestion =
    (selectedQuestionId && wagersByQuestion[selectedQuestionId]) || {}
  const getWagerForTeam = (teamId) =>
    Math.max(0, Number(wagersForQuestion?.[teamId] || 0))
  const finalResultForTeam = (teamId) => finalResultsByTeam[teamId]
  const scoreValue = isDailyDouble
    ? (selectedQuestion?.value || 0) * 2
    : selectedQuestion?.value || 0
  const setFinalResultForTeam = (teamId, result) => {
    setFinalResultsByTeam((prev) => ({
      ...prev,
      [teamId]: result,
    }))
  }
  const finalStandings = useMemo(() => {
    if (!teams.length) return []
    return [...teams].sort((a, b) => b.score - a.score)
  }, [teams])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-shell" data-theme={colorMode}>
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
            <Stack spacing={0.25}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {gameData?.title || 'Jeopardy'}
              </Typography>
              {gameData?.subtitle && (
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {gameData.subtitle}
                </Typography>
              )}
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ marginLeft: 'auto', alignItems: 'center' }}
            >
              {teams.length > 0 && (
                <Stack direction="row" spacing={1}>
                  {teams.map((team, index) => (
                    <Chip
                      key={team.id}
                      label={`${team.name}: $${team.score}`}
                      color={index === activeTeamIndex ? 'secondary' : 'default'}
                      variant={index === activeTeamIndex ? 'filled' : 'outlined'}
                      onClick={() => setActiveTeamIndex(index)}
                    />
                  ))}
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={soundEnabled ? 'Mute' : 'Unmute'}>
                      <IconButton
                        color="inherit"
                        onClick={() => setSoundEnabled((prev) => !prev)}
                      >
                        {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                      </IconButton>
                    </Tooltip>
                    <Slider
                      size="small"
                      min={0}
                      max={1}
                      step={0.05}
                      value={soundVolume}
                      onChange={(_, value) =>
                        setSoundVolume(Array.isArray(value) ? value[0] : value)
                      }
                      sx={{ width: 90 }}
                    />
                  </Stack>
                </Stack>
              )}
              <IconButton color="inherit" onClick={handleToggleTheme}>
                {colorMode === 'dark' ? (
                  <Brightness7Icon />
                ) : (
                  <Brightness4Icon />
                )}
              </IconButton>
              <Button color="inherit" variant="outlined" onClick={handleReset}>
                New Game
              </Button>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box className="app-content">
          {loading && (
            <Box className="centered">
              <CircularProgress color="secondary" />
            </Box>
          )}

          {!loading && error && (
            <Alert severity="error">{error}</Alert>
          )}

          {!loading && !error && gameData && (
            <Stack spacing={3}>
              <Paper className="board" elevation={4}>
                <Box
                  className="board-grid"
                  sx={{
                    gridTemplateColumns: `repeat(${gameData.categories.length}, minmax(0, 1fr))`,
                  }}
                >
                  {gameData.categories.map((category, categoryIndex) => (
                    <Box key={category.name} className="category-header">
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        {category.name}
                      </Typography>
                      {category.hint && (
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          {category.hint}
                        </Typography>
                      )}
                    </Box>
                  ))}

                  {Array.from({ length: maxQuestions }).map((_, rowIndex) =>
                    gameData.categories.map((category, categoryIndex) => {
                      const question = category.questions[rowIndex]
                      if (!question) {
                        return (
                          <Box
                            key={`empty-${categoryIndex}-${rowIndex}`}
                            className="cell empty"
                          />
                        )
                      }

                      const id = buildQuestionId(categoryIndex, rowIndex)
                      const answered = Boolean(answeredMap[id])
                      const isDailyDoubleCell = isDailyDoubleQuestion(
                        categoryIndex,
                        rowIndex,
                      )
                      return (
                        <ButtonBase
                          key={id}
                          className={`cell ${answered ? 'answered' : ''}`}
                          disabled={answered}
                          onClick={() =>
                            handleSelectQuestion({
                              id,
                              question,
                              category,
                              categoryIndex,
                              questionIndex: rowIndex,
                            })
                          }
                        >
                          <Typography variant="h6" className="cell-value">
                            {answered
                              ? 'Answered'
                              : `$${question.value}${
                                  showDailyDoubleMarkers && isDailyDoubleCell
                                    ? ' •'
                                    : ''
                                }`}
                          </Typography>
                        </ButtonBase>
                      )
                    }),
                  )}
                </Box>
              </Paper>

            </Stack>
          )}
        </Box>
      </Box>

      <Dialog
        open={Boolean(selected)}
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {selectedCategory?.name}
              {isDailyDouble ? ' • 🎉 Daily Double 🎉' : ''}
            </Typography>
            {selectedQuestion?.value && (
              <Chip
                label={`$${scoreValue}`}
                color="secondary"
                sx={{ marginLeft: 2 }}
              />
            )}
            <Box sx={{ marginLeft: 'auto' }}>
              <IconButton onClick={handleCloseDialog} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              {selectedQuestion?.clue}
            </Typography>
            {!revealAnswer && isFinalJeopardy && teams.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ marginBottom: 1 }}>
                  Final Jeopardy Wagers
                </Typography>
                <Stack spacing={1}>
                  {teams.map((team) => (
                    <TextField
                      key={team.id}
                      label={`${team.name} Wager`}
                      type="number"
                      size="small"
                      inputProps={{ min: 0 }}
                      value={wagersForQuestion[team.id] ?? ''}
                      onChange={(event) => {
                        const rawValue = Number(event.target.value)
                        const nextValue = Number.isNaN(rawValue)
                          ? 0
                          : Math.max(0, rawValue)
                        setWagersByQuestion((prev) => ({
                          ...prev,
                          [selectedQuestionId]: {
                            ...(prev[selectedQuestionId] || {}),
                            [team.id]: nextValue,
                          },
                        }))
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            <Divider />
            {revealAnswer ? (
              <Typography variant="h4" color="secondary" sx={{ fontWeight: 700 }}>
                {selectedQuestion?.answer}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Answer hidden. Reveal when ready.
              </Typography>
            )}
            {revealAnswer && selectedQuestion?.reference && (
              <Typography variant="caption" color="text.secondary">
                {selectedQuestion?.href ? (
                  <Link
                    href={selectedQuestion.href}
                    target="_blank"
                    rel="noreferrer"
                    color="secondary"
                    underline="always"
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedQuestion.reference}
                  </Link>
                ) : (
                  selectedQuestion.reference
                )}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-start' }}>
          {!revealAnswer ? (
            <Button onClick={handleRevealAnswer}>Reveal Answer</Button>
          ) : isFinalJeopardy ? (
            <Stack direction="column" spacing={1}>
              {teams.map((team) => {
                const result = finalResultForTeam(team.id)
                return (
                  <Stack key={team.id} direction="row" spacing={1}>
                    {!result ? (
                      <>
                        <Button
                          variant="contained"
                          color="secondary"
                          onClick={() => {
                            applyScoreDeltaForTeam(
                              team.id,
                              getWagerForTeam(team.id),
                            )
                            playSound('correct')
                            setFinalResultForTeam(team.id, 'correct')
                          }}
                        >
                          {team.name} Correct (+${getWagerForTeam(team.id)})
                        </Button>
                        <Button
                          onClick={() => {
                            applyScoreDeltaForTeam(
                              team.id,
                              -getWagerForTeam(team.id),
                            )
                            playSound('incorrect')
                            setFinalResultForTeam(team.id, 'incorrect')
                          }}
                        >
                          {team.name} Incorrect (-${getWagerForTeam(team.id)})
                        </Button>
                      </>
                    ) : (
                      <Chip
                        label={`${team.name}: ${
                          result === 'correct' ? 'Correct' : 'Incorrect'
                        }`}
                        color={result === 'correct' ? 'secondary' : 'default'}
                        variant="outlined"
                      />
                    )}
                  </Stack>
                )
              })}
              <Button variant="contained" onClick={handleMarkAnswered}>
                Finish Final
              </Button>
            </Stack>
          ) : (
            <>
              <Button
                onClick={handleScoreCorrect}
                variant="contained"
                color="secondary"
                disabled={!canScore}
              >
                Correct (+${scoreValue})
              </Button>
              <Button onClick={handleScoreIncorrect} disabled={!canScore}>
                Incorrect (-${scoreValue})
              </Button>
              <Button onClick={handleNoCorrectResponse} disabled={!canScore}>
                No Correct Response
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={showTeamSetup} maxWidth="xs" fullWidth>
        <DialogTitle>Set Teams</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Choose the number of teams to start the game.
            </Typography>
            <Select
              value={teamCount}
              onChange={(event) => setTeamCount(Number(event.target.value))}
              fullWidth
            >
              {[2, 3, 4, 5, 6].map((count) => (
                <MenuItem key={count} value={count}>
                  {count} Teams
                </MenuItem>
              ))}
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleCreateTeams}>
            Start Game
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showFinalIntro} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              🎉 Final Jeopardy 🎉
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h3">🎊✨🎊</Typography>
            <Typography variant="body1">
              Get ready for the final clue!
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button variant="contained" onClick={handleOpenFinalJeopardy}>
            Open Final Jeopardy
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDailyDoubleIntro}
        maxWidth="sm"
        fullWidth
        onClose={() => {
          setShowDailyDoubleIntro(false)
          setPendingDailyDouble(null)
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              🎯 Daily Double 🎯
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} alignItems="center" textAlign="center">
            <Typography variant="h3">✨💥✨</Typography>
            <Typography variant="body1">
              The next clue is worth double!
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center' }}>
          <Button variant="contained" onClick={handleOpenDailyDoubleQuestion}>
            Open Daily Double
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showFinalStandings} maxWidth="sm" fullWidth>
        <DialogTitle>Final Standings</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {finalStandings.map((team, index) => (
              <Box
                key={team.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 2,
                  backgroundColor:
                    index === 0
                      ? 'rgba(255, 179, 0, 0.15)'
                      : 'transparent',
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {index + 1}. {team.name}
                </Typography>
                <Typography variant="subtitle1">${team.score}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFinalStandings}>Close</Button>
          <Button variant="contained" onClick={handleReset}>
            New Game
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}

export default App

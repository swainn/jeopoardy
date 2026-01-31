import { useEffect, useMemo, useState } from 'react'
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
  Paper,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
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
  const [teams, setTeams] = useState([
    { id: 'team-1', name: 'Team 1', score: 0 },
    { id: 'team-2', name: 'Team 2', score: 0 },
  ])
  const [activeTeamIndex, setActiveTeamIndex] = useState(0)

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

  const maxQuestions = useMemo(() => {
    if (!gameData?.categories?.length) return 0
    return Math.max(
      ...gameData.categories.map((category) => category.questions.length),
    )
  }, [gameData])

  const handleOpenQuestion = (payload) => {
    setSelected(payload)
    setRevealAnswer(false)
  }

  const handleCloseDialog = () => {
    setSelected(null)
    setRevealAnswer(false)
  }

  const handleMarkAnswered = () => {
    if (!selected) return
    const id = selected.id
    setAnsweredMap((prev) => ({
      ...prev,
      [id]: true,
    }))
    handleCloseDialog()
  }

  const handleReset = () => {
    setAnsweredMap({})
    setSelected(null)
    setRevealAnswer(false)
    setTeams([
      { id: 'team-1', name: 'Team 1', score: 0 },
      { id: 'team-2', name: 'Team 2', score: 0 },
    ])
    setActiveTeamIndex(0)
  }

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
          ? { ...team, score: team.score + delta }
          : team,
      ),
    )
  }

  const handleScoreCorrect = () => {
    if (!selectedQuestion?.value) return
    applyScoreDelta(selectedQuestion.value)
    handleMarkAnswered()
  }

  const handleScoreIncorrect = () => {
    if (!selectedQuestion?.value) return
    applyScoreDelta(-selectedQuestion.value)
    handleSwitchTeam()
    handleMarkAnswered()
  }

  const handleNoCorrectResponse = () => {
    handleMarkAnswered()
  }

  const selectedQuestion = selected?.question
  const selectedCategory = selected?.category
  const activeTeam = teams[activeTeamIndex]
  const canScore = Boolean(selectedQuestion?.value)

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
              </Stack>
              <IconButton color="inherit" onClick={handleToggleTheme}>
                {colorMode === 'dark' ? (
                  <Brightness7Icon />
                ) : (
                  <Brightness4Icon />
                )}
              </IconButton>
              <Button color="inherit" variant="outlined" onClick={handleReset}>
                Reset Board
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
                      return (
                        <ButtonBase
                          key={id}
                          className={`cell ${answered ? 'answered' : ''}`}
                          disabled={answered}
                          onClick={() =>
                            handleOpenQuestion({
                              id,
                              question,
                              category,
                              categoryIndex,
                              questionIndex: rowIndex,
                            })
                          }
                        >
                          <Typography variant="h6" className="cell-value">
                            {answered ? 'Answered' : `$${question.value}`}
                          </Typography>
                        </ButtonBase>
                      )
                    }),
                  )}
                </Box>
              </Paper>

              {gameData.finalJeopardy && (
                <Paper className="final" elevation={3}>
                  <Stack
                    direction={{ xs: 'column', md: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                  >
                    <Box>
                      <Typography variant="overline" color="secondary">
                        Final Jeopardy
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {gameData.finalJeopardy.category}
                      </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() =>
                        handleOpenQuestion({
                          id: 'final',
                          question: gameData.finalJeopardy,
                          category: { name: gameData.finalJeopardy.category },
                          isFinal: true,
                        })
                      }
                    >
                      Open Final Jeopardy
                    </Button>
                  </Stack>
                </Paper>
              )}
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
            </Typography>
            {selectedQuestion?.value && (
              <Chip
                label={`$${selectedQuestion.value}`}
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
            <Button onClick={() => setRevealAnswer(true)}>
              Reveal Answer
            </Button>
          ) : (
            <>
              <Button
                onClick={handleScoreCorrect}
                variant="contained"
                color="secondary"
                disabled={!canScore}
              >
                Correct (+${selectedQuestion?.value || 0})
              </Button>
              <Button onClick={handleScoreIncorrect} disabled={!canScore}>
                Incorrect (-${selectedQuestion?.value || 0})
              </Button>
              <Button onClick={handleNoCorrectResponse} disabled={!canScore}>
                No Correct Response
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}

export default App

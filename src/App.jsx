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
  Link,
  Paper,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material'
import './App.css'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1565c0',
    },
    secondary: {
      main: '#ffb300',
    },
    background: {
      default: '#0b1220',
      paper: '#111a2b',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

const buildQuestionId = (categoryIndex, questionIndex) =>
  `c${categoryIndex}-q${questionIndex}`

function App() {
  const [gameData, setGameData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [answeredMap, setAnsweredMap] = useState({})

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
  }

  const selectedQuestion = selected?.question
  const selectedCategory = selected?.category

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-shell">
        <AppBar position="static" color="primary" elevation={0}>
          <Toolbar>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {gameData?.title || 'Jeopardy'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ marginLeft: 'auto' }}>
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

      <Dialog open={Boolean(selected)} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {selectedCategory?.name}
            </Typography>
            {selectedQuestion?.value && (
              <Chip label={`$${selectedQuestion.value}`} color="secondary" />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body1">{selectedQuestion?.clue}</Typography>
            <Divider />
            {revealAnswer ? (
              <Typography variant="h6" color="secondary">
                {selectedQuestion?.answer}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Answer hidden. Reveal when ready.
              </Typography>
            )}
            {selectedQuestion?.reference && (
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
        <DialogActions>
          <Button onClick={() => setRevealAnswer((prev) => !prev)}>
            {revealAnswer ? 'Hide Answer' : 'Reveal Answer'}
          </Button>
          <Button variant="contained" onClick={handleMarkAnswered}>
            Mark Answered
          </Button>
          <Button color="inherit" onClick={handleCloseDialog}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  )
}

export default App

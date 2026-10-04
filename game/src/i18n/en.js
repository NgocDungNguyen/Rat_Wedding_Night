// English UI strings. TODO: placeholder copy, review with Albert.
export default {
  title: 'Đám cưới Làng Chuột',
  subtitle: 'Rat Village Wedding',
  boot: { loading: 'Loading', fonts: 'Fonts', world: 'Building the village', sound: 'Sound', start: 'Click to begin' },
  opening: {
    studio: 'TODO · Studio name', presents: 'presents',
    line: 'Every year the rat village pays tribute to the cats, so the wedding may pass in peace.',
    skip: 'Press any key to skip',
  },
  menu: {
    newGame: 'New Game', continue: 'Continue', chapters: 'Chapters', settings: 'Settings', credits: 'Credits', quit: 'Quit',
    confirmTitle: 'Start over?', confirmBody: 'Your saved progress will be erased.', yes: 'Yes', no: 'Cancel',
    lastPlayed: 'At: {chapter}',
  },
  chapters: { title: 'Chapters', locked: 'Locked', completed: 'Completed', chapter: 'Chapter {n}' },
  settings: {
    title: 'Settings', reset: 'Reset to defaults', back: 'Back', on: 'On', off: 'Off',
    tabs: { graphics: 'Graphics', controls: 'Controls', audio: 'Audio', access: 'Language & Access' },
    quality: 'Quality', qualityLow: 'Low', qualityMedium: 'Medium', qualityHigh: 'High',
    resScale: 'Resolution scale', brightness: 'Brightness', calib: 'Adjust until the symbol is barely visible',
    fov: 'Field of view', motionBlur: 'Motion blur', cameraShake: 'Camera shake',
    sensitivity: 'Mouse sensitivity', invertY: 'Invert Y axis', keys: 'Keys', pressKey: 'Press a key…', escFixed: 'Esc: Pause (fixed)',
    volMaster: 'Master volume', volMusic: 'Music', volSfx: 'Effects', volVoice: 'Voice',
    subtitles: 'Subtitles', language: 'Language',
  },
  actions: { forward: 'Forward', back: 'Back', left: 'Left', right: 'Right', sprint: 'Sprint', crouch: 'Crouch', interact: 'Interact', lantern: 'Lantern' },
  credits: {
    title: 'Credits', design: 'Design & development', designBy: 'Albert · TODO studio name',
    inspired: 'Inspired by', inspiredBy: 'The Đông Hồ folk print “The Rats’ Wedding” (Đám cưới chuột)',
    tech: 'Technology', fonts: 'Fonts', sounds: 'Sounds (Wikimedia Commons)', music: 'Music', musicBy: 'TODO · placeholder from the trailer',
  },
  farewell: { title: 'See you again', sub: 'The lamps are out. The village is quiet again.', click: 'Click to return' },
  intro: { chapter: 'Chapter {n}', objective: 'Objective', continue: 'Click to begin' },
  hud: { clickToResume: 'Click to resume', debug: 'F8: complete chapter · F9: game over · F7: fast move (debug)' },
  pause: { title: 'Paused', resume: 'Resume', settings: 'Settings', restart: 'Restart chapter', menu: 'Main menu' },
  complete: { title: 'Dawn', sub: 'You survived {night}', unlocked: 'Unlocked: {chapter}', next: 'Next chapter', menu: 'Main menu', end: 'The end. TODO: ending' },
  over: { title: 'Caught', sub: 'The night swallows you.', retry: 'Retry', menu: 'Main menu' },
};

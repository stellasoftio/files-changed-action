export const FILE_PATHS = (process.env['INPUT_FILE-PATHS'] || '')
.split('\n')
.map((path) => path.trim())
.filter((path) => !!path);

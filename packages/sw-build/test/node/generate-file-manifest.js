const proxyquire = require('proxyquire');

const swBuild = require('../../src/index.js');
const errors = require('../../src/lib/errors');

describe('Test generateFileManifest', function() {
  const EXAMPLE_INPUT = {
    staticFileGlobs: ['./**/*.{html,css}'],
    globIgnores: [],
    dest: './manifest.js',
    rootDirectory: '.',
  };

  it('should be able to handle bad input', function() {
    const badInputs = [
      undefined,
      null,
      '',
      [],
      true,
      false,
    ];
    return badInputs.reduce((promiseChain, badInput) => {
      return promiseChain.then(() => {
        return swBuild.generateFileManifest(badInput)
        .then(() => {
          throw new Error('Expected to throw error.');
        })
        .catch((err) => {
          if (err.message !== errors['invalid-generate-file-manifest-arg']) {
            throw new Error('Unexpected error: ' + err.message);
          }
        });
      });
    }, Promise.resolve());
  });

  it('should return file entries through each phase', function() {
    const FILE_ENTRIES = [{
      file: './glob-entry-1',
      hash: '1234',
      size: 1,
    }, {
      file: './glob-entry-2',
      hash: '4321',
      size: 2,
    }];
    const generateFileManifest = proxyquire(
      '../../src/lib/generate-file-manifest.js', {
        './get-file-manifest-entries': ({rootDirectory, staticFileGlobs, globIgnores}) => {
          if (globIgnores !== EXAMPLE_INPUT.globIgnores) {
            throw new Error('Invalid glob ignores value.');
          }

          if (rootDirectory !== EXAMPLE_INPUT.rootDirectory) {
            throw new Error('Invalid rootDirectory value.');
          }

          if (staticFileGlobs !== EXAMPLE_INPUT.staticFileGlobs) {
            throw new Error('Invalid glob pattern.');
          }

          return Promise.resolve(FILE_ENTRIES);
        },
        './utils/write-file-manifest': (manifestFilePath, entries) => {
          entries.forEach((entry) => {
            let matchingOracle = null;
            FILE_ENTRIES.forEach((oracleEntry) => {
              if (entry.file === oracleEntry.file) {
                matchingOracle = oracleEntry;
              }
            });
            if (!matchingOracle || entry.hash !== matchingOracle.hash || entry.size !== matchingOracle.size) {
              throw new Error('Could not find matching file entry.');
            }
          });

          if (entries.length !== FILE_ENTRIES.length) {
            throw new Error('Unexpected file entries - should have duplicates removed.');
          }

          if (manifestFilePath !== EXAMPLE_INPUT.dest) {
            throw new Error('Unexpected manifest File Path');
          }

          return Promise.resolve();
        },
      }
    );
    return generateFileManifest(EXAMPLE_INPUT);
  });
});

const proxyquire = require('proxyquire');
const path = require('path');

const swBuild = require('../src/index.js');
const errors = require('../src/lib/errors');

describe('Test getFileManifestEntries', function() {
  const EXAMPLE_INPUT = {
    staticFileGlobs: ['./**/*.{html,css}'],
    globIgnores: [],
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
    badInputs.forEach((badInput) => {
      try {
        swBuild.getFileManifestEntries(badInput);
        throw new Error('Expected error to be thrown.');
      } catch (err) {
        if (err.message !== errors['invalid-get-manifest-entries-input']) {
          throw new Error('Unexpected error: ' + err.message);
        }
      }
    });
  });

  it('should detect bad rootDirectory', function() {
    const badInput = [
      undefined,
      null,
      '',
      [],
      true,
      false,
    ];
    return badInput.reduce((promiseChain, input) => {
      return promiseChain.then(() => {
        let args = Object.assign({}, EXAMPLE_INPUT);
        args.rootDirectory = input;
        return swBuild.getFileManifestEntries(args)
        .then(() => {
          throw new Error('Expected to throw error.');
        })
        .catch((err) => {
          if (err.message !== errors['invalid-root-directory']) {
            throw new Error('Unexpected error: ' + err.message);
          }
        });
      });
    }, Promise.resolve());
  });

  it('should detect bad staticFileGlobs', function() {
    const badInput = [
      undefined,
      null,
      '',
      true,
      false,
    ];
    return badInput.reduce((promiseChain, input) => {
      return promiseChain.then(() => {
        let args = Object.assign({}, EXAMPLE_INPUT);
        args.staticFileGlobs = input;
        return swBuild.getFileManifestEntries(args)
        .then(() => {
          throw new Error('Expected to throw error.');
        })
        .catch((err) => {
          if (err.message !== errors['invalid-static-file-globs']) {
            throw new Error('Unexpected error: ' + err.message);
          }
        });
      });
    }, Promise.resolve());
  });

  it('should be able to handle a bad maximumFileSizeToCacheInBytes input', function() {
    const badInput = [
      null,
      '',
      [],
      true,
      false,
      {},
    ];
    return badInput.reduce((promiseChain, input) => {
      return promiseChain.then(() => {
        let args = Object.assign({}, EXAMPLE_INPUT);
        args.maximumFileSizeToCacheInBytes = input;
        return swBuild.getFileManifestEntries(args)
        .then(() => {
          console.log('Input did not cause error: ', input);
          throw new Error('Expected to throw error.');
        })
        .catch((err) => {
          if (err.message !== errors['invalid-max-file-size']) {
            throw new Error('Unexpected error: ' + err.message);
          }
        });
      });
    }, Promise.resolve());
  });

  it('should return expeceted files.', function() {
    const testInput = {
      staticFileGlobs: [
        './glob-1',
        './glob-2',
      ],
      globIgnores: [
        './glob-ignore-1',
        './glob-ignore-2',
      ],
      rootDirectory: '.',
      maximumFileSizeToCacheInBytes: 2,
    };
    const EXPECTED_ENTRIES = [
      {
        file: path.resolve('glob-entry-1'),
        expectedUrl: '/glob-entry-1',
        hash: '1234',
        size: 1,
      }, {
        file: path.resolve('glob-entry-2'),
        expectedUrl: '/glob-entry-2',
        hash: '4321',
        size: 2,
      },
    ];
    const FILE_ENTRIES = EXPECTED_ENTRIES.concat([{
      file: path.resolve('glob-entry-3'),
      expectedUrl: '/glob-entry-3',
      hash: '54321',
      size: 3,
    }]);
    const getFileManifestEntries = proxyquire(
      '../src/lib/get-file-manifest-entries.js', {
        './utils/get-file-details': (rootDirectory, globPattern, globIgnores) => {
          if (globIgnores !== testInput.globIgnores) {
            throw new Error('Invalid glob ignores value.');
          }

          if (rootDirectory !== path.resolve(testInput.rootDirectory)) {
            throw new Error('Invalid rootDirectory value.');
          }

          if (testInput.staticFileGlobs.indexOf(globPattern) === -1) {
            throw new Error('Invalid glob pattern.');
          }

          return FILE_ENTRIES;
        },
      }
    );

    return getFileManifestEntries(testInput)
    .then((output) => {
      output.length.should.equal(EXPECTED_ENTRIES.length);
      output.forEach((entry) => {
        let matchingOracle = null;
        EXPECTED_ENTRIES.forEach((oracleEntry) => {
          if (entry.url === oracleEntry.expectedUrl) {
            matchingOracle = oracleEntry;
          }
        });
        if (!matchingOracle || entry.revision !== matchingOracle.hash) {
          throw new Error('Unexpected entry returned');
        }
      });
    });
  });
});

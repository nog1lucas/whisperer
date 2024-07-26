import { test, assert } from 'vitest'

import { closestSpeakerChange, merge } from '../../process-transcripts'
import { TranscribeSpeakerSegment } from '../../types'

test('it finds the closes speaker change', () => {
  const speakerChangeIndex = [
    { speakerLabel: 'spk_0', start: 0 },
    { speakerLabel: 'spk_1', start: 3 }
  ]

  assert.equal(closestSpeakerChange(speakerChangeIndex, 0)?.speakerLabel, 'spk_0')
  assert.equal(closestSpeakerChange(speakerChangeIndex, 1)?.speakerLabel, 'spk_0')
  assert.equal(closestSpeakerChange(speakerChangeIndex, 2)?.speakerLabel, 'spk_0')
  assert.equal(closestSpeakerChange(speakerChangeIndex, 3)?.speakerLabel, 'spk_1')
  assert.equal(closestSpeakerChange(speakerChangeIndex, 4)?.speakerLabel, 'spk_1')
  assert.equal(closestSpeakerChange(speakerChangeIndex, 100)?.speakerLabel, 'spk_1')
})

test('it merges a simple set of files', () => {
  const whisperSegments = [{
    start: 0,
    end: 2,
    text: 'Hello how are you doing today?'
  }, {
    start: 3,
    end: 5,
    text: 'I am doing great, thanks for asking.'
  }]

  const transcribeSegments = [
    {
      speakerLabel: 'spk_0',
      start: 0,
      end: 1
    },
    {
      speakerLabel: 'spk_0',
      start: 1,
      end: 2
    },
    {
      speakerLabel: 'spk_1',
      start: 3,
      end: 4
    },
    {
      speakerLabel: 'spk_1',
      start: 4,
      end: 5
    },
  ]

  const result = merge(whisperSegments, transcribeSegments)

  const expectedResult = {
    speakers: {
      spk_0: 'spk_0',
      spk_1: 'spk_1'
    },
    segments: [
      {
        speakerLabel: 'spk_0',
        start: 0,
        end: 2,
        text: 'Hello how are you doing today?'
      },
      {
        speakerLabel: 'spk_1',
        start: 3,
        end: 5,
        text: 'I am doing great, thanks for asking.'
      }
    ]
  }

  assert.deepEqual(result, expectedResult)
})

test('it merges segments where the first transcribe segment starts after the intiial audio silence', async () => {
  const whisperSegments = [
    { start: 0, end: 7.04, text: ' Node.js is considered by many a game changer, possibly the biggest innovation of the decade' },
    { start: 7.04, end: 36.64, text: ' in web development.' }
  ]
  const transcribeSegments = [
    { 'start': 1.41, end: 8.32, speakerLabel: 'spk_0' }
  ]
  const result = merge(whisperSegments, transcribeSegments)
  const expectedResult = {
    speakers: {
      spk_0: 'spk_0'
    },
    segments: [
      {
        speakerLabel: 'spk_0',
        start: 0,
        end: 7.04,
        text: ' Node.js is considered by many a game changer, possibly the biggest innovation of the decade'
      },
      {
        speakerLabel: 'spk_0',
        start: 7.04,
        end: 36.64,
        text: ' in web development.'
      }
    ]
  }
  assert.deepEqual(result, expectedResult)
})

test('it identifies speaker as unknown if there is no speaker data', async () => {
  const whisperSegments = [
    { start: 0, end: 1, text: 'Hello' },
    { start: 1, end: 2, text: 'Goodbye' }
  ]
  const transcribeSegments: TranscribeSpeakerSegment[] = []
  const result = merge(whisperSegments, transcribeSegments)
  assert.equal(result.segments.length, 2)
  for (const segment of result.segments) {
    assert.equal(segment.speakerLabel, 'unknown')
  }
})

test('it splits a segment if the speaker changes mid-sentence', () => {
  const whisperSegments = [
    { start: 0, end: 1, text: 'Hello. My name is Bob and I am here with' },
    { start: 1, end: 2, text: ' Alice. How are you today, Alice? I am good actually' },
    { start: 2, end: 3, text: ' thanks for asking.' }
  ]
  const transcribeSegments = [
    { 'start': 0, end: 1, speakerLabel: 'spk_0' },
    { 'start': 1, end: 1.5, speakerLabel: 'spk_0' },
    { 'start': 1.5, end: 3, speakerLabel: 'spk_1' }
  ]
  const expectedResult = {
    speakers: {
      spk_0: 'spk_0',
      spk_1: 'spk_1'
    },
    segments: [
      {
        speakerLabel: 'spk_0',
        start: 0,
        end: 1,
        text: 'Hello. My name is Bob and I am here with'
      },
      {
        speakerLabel: 'spk_0',
        start: 1,
        end: 2,
        text: ' Alice. How are you today, Alice?'
      },
      {
        speakerLabel: 'spk_1',
        start: 2,
        end: 3,
        text: ' I am good actually thanks for asking.'
      }
    ]
  }
  const result = merge(whisperSegments, transcribeSegments)
  assert.deepEqual(result, expectedResult)
})

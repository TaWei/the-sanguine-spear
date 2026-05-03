/** Supported character expressions */
export type Expression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised';

/** Position of a character portrait on screen */
export type PortraitPosition = 'left' | 'right';

/** A character that can appear in cutscenes */
export interface CutsceneCharacter {
  id: string;          // unique identifier (e.g., 'rowan', 'elara')
  name: string;        // display name (e.g., 'Rowan')
  portraitKey: string; // asset key for the portrait sprite
}

/** Cutscene commands — each is one "frame" or action in the sequence */
export type CutsceneCommand =
  | {
      type: 'speak';
      speakerId: string;
      text: string;
      expression?: Expression; // override expression for this line
      choices?: { label: string; jumpToLabel: string }[];
      label?: string;           // label for goto-jump targeting
    }
  | {
      type: 'enter';
      characterId: string;
      position: PortraitPosition;
      expression?: Expression;
    }
  | {
      type: 'exit';
      characterId: string;
    }
  | {
      type: 'expression';
      characterId: string;
      expression: Expression;
    }
  | {
      type: 'background';
      backgroundKey: string; // asset key for background image
    }
  | {
      type: 'wait';
      duration: number; // milliseconds
    }
  | {
      type: 'goto';
      label: string; // jump to a labeled frame
    }
  | {
      type: 'end';
    };

/** A cutscene script — ordered sequence of commands */
export interface CutsceneScript {
  id: string;
  title: string;
  frames: CutsceneCommand[];
}

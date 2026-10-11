/**
 * "Notched legend" fields: the label rests on the field's top border at
 * rest (like a <fieldset><legend>), then animates into a normal floating
 * label above the box on focus. Pure CSS (`:focus-within`), no JS state.
 *
 * One component per field type — drop-in replacements for their Components/ui
 * counterparts (TextField, TextArea, SelectField, PrimarySelect) wherever this
 * look is wanted instead. All of them assume a white surface behind the field
 * (the label's background masks the border line) — see NotchedField.js.
 */
export { default as NotchedField, NotchedFieldShell, NOTCHED_LABEL_CLASS, NOTCHED_INPUT_CLASS } from './NotchedField';
export { default as NotchedTextField } from './NotchedTextField';
export { default as NotchedTextArea } from './NotchedTextArea';
export { default as NotchedSelect } from './NotchedSelect';
export { default as NotchedSearchSelect } from './NotchedSearchSelect';

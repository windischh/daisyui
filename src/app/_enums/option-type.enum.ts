/**
 * Option type
 *
 */
export enum OptionType {
  undefined = 0,
  boolean = 1,
  string = 2,
  int = 3,
  numeric = 4,
  date = 5,
  // for stringValueChoice we must provide an entry in
  // util.getStringChoices or
  // util.getStyleStringChoices
  stringValueChoice = 11,
  // stringSequence types are allowed only in style-structured areas
  // all strimgSeq allow option entry for name and valuem where name must be  unique anyway!
  // stringSequence - user is free for both entries
  stringSequence = 12,
  // stringSeqNameChoice - user chooses a name from given choices
  // for this choices we must provide the entries in
  // util.getStringName ChoicesStyle / util.getStyleStringChoices
  stringSeqNameChoice = 13,
  // stringSeqValueChoice - user chooses a value from given choices
  stringSeqValueChoice = 14,
  // stringSeqValueChoiceUnique - user chooses a value from given choices, the value is also unique
  stringSeqValueChoiceUnique = 15,
  // stringSeqBothChoiceUnique - both are given choices, only name is unique
  stringSeqBothChoice = 16,
  // stringSeqBothChoiceUnique - both are given choices, both are unique
  stringSeqBothChoiceUnique = 17,
  // for numberValueChoice we must provide an entry in
  // util.getNumberChoices or
  // util.getNumberChoicesStyle
  intValueChoice = 21,
  // styleChoice is an intValueChoice where the choices are the available styles
  styleChoice = 22
}

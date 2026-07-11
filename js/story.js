import { CONFIG } from './config.js';

export const NOTES = {
  emily_log_1: {
    title: "Emily's Recording #1",
    body: "I found it. Ashgrove Children's Home. The place where they disappeared.\n\nThe building's been abandoned since 1958. Official story: gas leak. But the records I found tell a different story.\n\nDr. Victor Hale. He ran this place. Conducted experiments on the children. Said he was trying to contact something on the other side.\n\nI need to find his office. There has to be more here.",
    type: 'recording',
  },
  emily_log_2: {
    title: "Emily's Recording #2",
    body: "Day 3. Found Hale's journal entries.\n\nThis place is wrong. The walls feel like they're breathing. I keep hearing children laughing in empty rooms.\n\nHale was trying to open a door between worlds. He used the children as conduits. God help them.\n\nI found drawings. The children all drew the same figure. Over and over. A tall, thin shape with no face.",
    type: 'recording',
  },
  emily_log_3: {
    title: "Emily's Recording #3",
    body: "The children called it The Hollow One. They said it was coming for them.\n\nHale tried to banish it with a ritual. He needed 5 items placed in a circle. But he failed. The entity consumed the children one by one.\n\nI think I understand now. I need to find those ritual items. I need to finish what Hale started.\n\nSomething is watching me. I can feel it.",
    type: 'recording',
  },
  emily_log_4: {
    title: "Emily's Recording #4",
    body: "Found the first ritual item. A dagger in the basement experiment room.\n\nThe Hollow One knows I'm here. It's getting closer. I can hear it breathing through the walls.\n\nThe children's spirits are trying to help me. They whisper warnings. They point the way.\n\nI have to keep going. For them. For all of them.",
    type: 'recording',
  },
  emily_log_5: {
    title: "Emily's Recording #5",
    body: "Three items found. Two more to go.\n\nThe entity is hunting me now. It's faster than I thought. It can move through walls. It appears in mirrors.\n\nI found a safe in Hale's quarters. The code is in his journal. 1953. The year the first child disappeared.\n\nIf you're hearing this, Daniel... I'm sorry. I should have told you what I was doing.",
    type: 'recording',
  },
  emily_log_6: {
    title: "Emily's Final Recording",
    body: "[Recording is distorted, heavy static]\n\nI can't... I can't see it clearly anymore. The walls are moving. The children are screaming.\n\nThe Hollow One... it's inside me now. I can feel it feeding on my memories. My fear.\n\nDaniel, if you find this... complete the ritual. Free the children. Don't let it take you too.\n\nI love you, brother. I'm sorry.\n\n[Recording ends]",
    type: 'recording',
  },
  hale_journal_1: {
    title: "Dr. Hale's Journal - Entry 1",
    body: "The barrier between worlds grows thinner with each session. The children respond perfectly to the frequencies.\n\nSubjects have begun to see through. They speak of a figure on the other side. Tall. Watching. Waiting.\n\nI believe we are close to making contact. The children are the key. Their minds are unburdened by adult rationality.",
    type: 'note',
  },
  hale_journal_2: {
    title: "Dr. Hale's Journal - Entry 2",
    body: "Breakthrough success beyond my wildest dreams. The entity has fully manifested. It calls itself The Hollow One.\n\nIt feeds on fear. On memories. The children are terrified now, but the entity grows stronger with each feeding.\n\nI must document everything. This is the greatest discovery in human history. Contact with the other side.",
    type: 'note',
  },
  hale_journal_3: {
    title: "Dr. Hale's Journal - Entry 3",
    body: "I tried to stop it. I tried to close the door, but it won't close. The Hollow One is inside the walls now. Inside everything.\n\nThe children are disappearing one by one. I can hear them screaming in the basement. But when I go down there, they're gone. Just... gone.\n\nGod forgive me. What have I done?",
    type: 'note',
  },
  hale_journal_4: {
    title: "Dr. Hale's Journal - Final Entry",
    body: "Found the banishing ritual in the old texts. Five items in a circle. An incantation spoken at midnight.\n\nBut it's too late for me. The Hollow One knows what I'm planning. It's coming for me now.\n\nIf anyone finds this... the ritual items are hidden throughout the building. The dagger in the experiment room. The chalice in the dining hall. The candle in the dormitory. The book in the classroom. The key in the infirmary.\n\nComplete the ritual. Banish it. Free the children.\n\nThe safe code is 1953. The year this nightmare began.",
    type: 'note',
  },
  child_drawing_1: {
    title: "Child's Drawing #1",
    body: "[A child's crude drawing of stick figures - a family with a tall dark figure standing behind them with long arms reaching down. The word HELP is scrawled at the top.]",
    type: 'drawing',
  },
  child_drawing_2: {
    title: "Child's Drawing #2",
    body: "[A house with dark windows. Eyes peer out from the darkness inside. Something tall stands in the doorway.]",
    type: 'drawing',
  },
  child_drawing_3: {
    title: "Child's Drawing #3",
    body: "[Five stick figures getting progressively larger from left to right. The last one is drawn in dark red crayon with no face.]",
    type: 'drawing',
  },
  medical_record_1: {
    title: "Medical Record - Patient #7",
    body: "Patient: Thomas M., Age 9\nDate: March 14, 1956\n\nSubject responded well to initial exposure session. Reported seeing tall figure in corner of room. Described it as having no face, just darkness.\n\nPhysiological signs: elevated heart rate, dilated pupils, trembling. Subject became catatonic for 3 minutes post-session.\n\nRecommendation: Continue exposure. Increase frequency.",
    type: 'note',
  },
  medical_record_2: {
    title: "Medical Record - Patient #12",
    body: "Patient: Sarah H., Age 8\nDate: March 21, 1956\n\nSubject has begun drawing the same figure repeatedly. Claims it watches her while she sleeps. Says it whispers to her.\n\nSubject has lost 5 pounds in past week. Refuses to eat. Says the figure tells her not to.\n\nRecommendation: Isolate subject. Increase sedation.",
    type: 'note',
  },
  medical_record_3: {
    title: "Medical Record - Patient #23",
    body: "Patient: James R., Age 11\nDate: April 2, 1956\n\nSubject disappeared during session. Room was sealed. No exits. Witnesses confirm subject simply vanished.\n\nSearch of facility yielded no results. Subject presumed dead.\n\nRecommendation: Cover up incident. Continue experiments with remaining subjects.",
    type: 'note',
  },
  ritual_instructions: {
    title: "Ritual Instructions",
    body: "To banish The Hollow One and free the trapped souls:\n\n1. Gather the five ritual items:\n   - Dagger (Experiment Room)\n   - Chalice (Dining Hall)\n   - Candle (Dormitory)\n   - Book (Classroom)\n   - Key (Infirmary)\n\n2. Place items in the ritual circle in the basement chamber\n\n3. At midnight, speak the incantation:\n   'By blood and bone, by light and dark,\n   I banish thee from this place.\n   Return to the void from whence you came.\n   Release the souls you have consumed.'\n\n4. The entity will resist. Hold your ground. Do not flee.",
    type: 'note',
  },
  newspaper_clipping: {
    title: "Newspaper Clipping - 1958",
    body: "ASHGROVE CHILDREN'S HOME CLOSED AFTER GAS LEAK\n\nLocal authorities have closed the Ashgrove Children's Home following a gas leak that forced evacuation of all residents.\n\nDr. Victor Hale, director of the facility, could not be reached for comment. Officials state all children have been relocated to other facilities.\n\nRumors persist of strange occurrences at the home, but police have dismissed these as unfounded speculation.\n\nThe building will remain sealed pending investigation.",
    type: 'note',
  },
  letter_to_daniel: {
    title: "Letter to Daniel",
    body: "Daniel,\n\nIf you're reading this, I didn't make it out. I'm sorry I didn't tell you what I was doing. I didn't want you involved.\n\nThe children here... they're trapped. Their souls consumed by something evil. I had to try to free them.\n\nFind the ritual items. Complete the banishing. Free them, Daniel. Please.\n\nAnd if you see me... if you see what's left of me... don't hesitate. Finish the ritual.\n\nI love you.\n\n- Emily",
    type: 'note',
  },
};

export const STORY_TRIGGERS = {
  enter_entrance: {
    act: 1,
    objective: "Find the main office to access building records",
    cutscene: {
      title: "Act I - Descent",
      text: "The door slams behind you. You're trapped.\n\nYour flashlight flickers. The air is thick with dust and decay.\n\nYou hear something moving in the darkness...",
    },
  },
  find_emily_log_1: {
    act: 1,
    objective: "Explore the ground floor and find Emily's recordings",
  },
  find_hale_journal: {
    act: 1,
    objective: "Learn about Dr. Hale's experiments",
  },
  power_outage: {
    act: 1,
    objective: "The power has gone out. Find the breaker in the basement",
    cutscene: {
      title: "",
      text: "The lights die. Darkness consumes everything.\n\nFrom deep below, you hear something stir...",
    },
  },
  enter_basement: {
    act: 2,
    objective: "Restore power and find the ritual chamber",
    cutscene: {
      title: "Act II - The Basement",
      text: "You descend into the darkness below.\n\nThe air grows colder. The walls seem to breathe.\n\nSomething is down here with you...",
    },
  },
  restore_power: {
    act: 2,
    objective: "Power restored. But something has awakened...",
    cutscene: {
      title: "",
      text: "The lights flicker back to life.\n\nBut you're not alone anymore.\n\nIt knows you're here.",
    },
  },
  first_entity_sighting: {
    act: 2,
    objective: "The Hollow One has awakened. Find the ritual items to banish it",
  },
  enter_upper_floor: {
    act: 3,
    objective: "Search the upper floors for ritual items",
    cutscene: {
      title: "Act III - The Hunt",
      text: "The entity hunts you now.\n\nHide when you can. Run when you must.\n\nFind the ritual items. It's the only way out.",
    },
  },
  find_all_ritual_items: {
    act: 4,
    objective: "Return to the basement ritual chamber with all items",
    cutscene: {
      title: "Act IV - The Ritual",
      text: "You have everything you need.\n\nReturn to the ritual chamber.\n\nComplete the banishing. Free the children.\n\nBut be warned... it will not let you go easily.",
    },
  },
  begin_ritual: {
    act: 4,
    objective: "Complete the banishing ritual",
  },
};

export const ENDINGS = {
  good: {
    title: "The Banishing",
    text: "The ritual circle blazes with light. The Hollow One screams as it's torn apart, its form dissolving into shadow.\n\nThe children's spirits appear, one by one. They smile. They're free.\n\nEmily appears last. She looks at you with sad eyes.\n\n'Thank you, Daniel,' she whispers. 'I'm sorry I couldn't come home.'\n\nShe fades into light.\n\nYou walk out as dawn breaks over Ashgrove. The nightmare is over.\n\nBut you'll never forget what you saw. What you lost.",
  },
  neutral: {
    title: "The Escape",
    text: "You run. You don't look back.\n\nThe front door bursts open. You stumble into the cold night air.\n\nYou drive away, hands shaking on the wheel. You made it out.\n\nBut as you glance in the rearview mirror, you see it.\n\nThe Hollow One stands in the road, watching you leave.\n\nIts faceless head tilts. It knows where you live now.\n\nThe screen cuts to black.",
  },
  bad: {
    title: "Consumed",
    text: "The Hollow One catches you during the ritual.\n\nIts long fingers wrap around your throat. You can't breathe. You can't scream.\n\nIt pulls you into the darkness. Into the walls. Into the void.\n\nYou hear Emily's voice, distant and sad:\n\n'I told you not to come.'\n\nYou are now one of the shadows.\n\nTrapped forever in Ashgrove.",
  },
};

export class StoryManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentAct = 1;
    this.triggeredEvents = new Set();
    this.foundNotes = new Set();
    this.ritualItemsFound = new Set();
    this.objective = "Explore the entrance hall";
  }

  trigger(eventName) {
    if (this.triggeredEvents.has(eventName)) return;

    const trigger = STORY_TRIGGERS[eventName];
    if (!trigger) return;

    this.triggeredEvents.add(eventName);

    if (trigger.act && trigger.act > this.currentAct) {
      this.currentAct = trigger.act;
      this.eventBus.emit('actChange', this.currentAct);
    }

    if (trigger.objective) {
      this.objective = trigger.objective;
      this.eventBus.emit('objectiveUpdate', this.objective);
    }

    if (trigger.cutscene) {
      this.eventBus.emit('cutscene', trigger.cutscene);
    }

    this.eventBus.emit('storyTrigger', eventName);
  }

  findNote(noteId) {
    if (this.foundNotes.has(noteId)) return false;
    this.foundNotes.add(noteId);
    this.eventBus.emit('noteFound', noteId);
    return true;
  }

  findRitualItem(itemId) {
    if (this.ritualItemsFound.has(itemId)) return false;
    this.ritualItemsFound.add(itemId);
    this.eventBus.emit('ritualItemFound', itemId);

    if (this.ritualItemsFound.size >= 5) {
      this.trigger('find_all_ritual_items');
    }

    return true;
  }

  getCurrentAct() {
    return this.currentAct;
  }

  getObjective() {
    return this.objective;
  }

  hasTriggered(eventName) {
    return this.triggeredEvents.has(eventName);
  }

  hasFoundNote(noteId) {
    return this.foundNotes.has(noteId);
  }

  hasFoundRitualItem(itemId) {
    return this.ritualItemsFound.has(itemId);
  }

  getRitualItemsCount() {
    return this.ritualItemsFound.size;
  }

  reset() {
    this.currentAct = 1;
    this.triggeredEvents.clear();
    this.foundNotes.clear();
    this.ritualItemsFound.clear();
    this.objective = "Explore the entrance hall";
  }
}

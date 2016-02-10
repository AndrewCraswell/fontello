'use strict';


// Reassign tooltip handler
// after every significant page render
//
N.wire.after('navigate.done', function () {
  $('._tip').tooltip();
  $('._popover').popover();
});
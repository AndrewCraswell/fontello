/*global fontomas, _, Backbone*/

;(function () {
  "use strict";


  var takeCode = function (obj, code) {
    obj.unicode_used[code] = true;

    if (32 <= code && code <= 126) {
      obj.unicode_free = _.without(obj.unicode_free, code);
      // _.without() seems to maintain the sort order
      //obj.unicode_free = _.sortBy(obj.unicode_free, function (v) { return v; });
    }

    return code;
  };


  var freeCode = function (obj, code) {
    delete obj.unicode_used[code];

    if (32 <= code && code <= 126) {
      obj.unicode_free.unshift(code);
      obj.unicode_free = _.sortBy(obj.unicode_free, function (v) { return v; });
    }
  };


  var findGlyphByUnicode = function (collection, unicode_code) {
    return _.find(collection, function (item) {
      return item.get("unicode_code") === unicode_code;
    });
  };


  fontomas.models.glyphs_collection = Backbone.Collection.extend({
    unicode_used: {},
    unicode_free: [],


    initialize: function () {
      var code;

      for (code = 32; code <= 126; code++) {
        this.unicode_free.push(code);
      }
    },


    add: function (glyph, options) {
      var unicode_code,
          orig_unicode = glyph.get("source_glyph").unicode_code;

      if (!this.unicode_used[orig_unicode]) {
        unicode_code = takeCode(this, orig_unicode);
      } else {
        if (!this.unicode_free.length) {
          fontomas.logger.debug("models.glyphs_collection.add: no room to add glyph");
          return;
        }

        unicode_code = takeCode(this, this.unicode_free[0]);
      }

      glyph.set("unicode_code", unicode_code);
      glyph.on("change:unicode_code", this.onChangeGlyphCode, this);

      glyph.on('remove', function (glyph) {
        var code = glyph.get("unicode_code");

        if (!this.unicode_used[code]) {
          fontomas.logger.error(
            "models.glyphs_collection.remove: code <" + code + "> " +
            "not found in unicode_used map"
          );
          return;
        }

        freeCode(this, code);
      }, this);

      Backbone.Collection.prototype.add.call(this, glyph, options);
    },


    // release/overtake new code by glyph
    // swaps glyphs if new code is already taken.
    onChangeGlyphCode: function (model, new_code) {
      var found_glyph,
          models,
          old_code = model.previous("unicode_code");

      // select all the models except one has been changed
      models = _.select(this.models, function (item) {
        return item !== model;
      });
      found_glyph = findGlyphByUnicode(models, new_code);

      if (found_glyph) {
        // if the model's unicode_code has changed to already used one
        // then we should swap glyph codes
        found_glyph.set("unicode_code", old_code);
      } else {
        found_glyph = findGlyphByUnicode(this.models, old_code);

        // if old_code is not used any more, we should free it
        if (this.unicode_used[old_code] && !found_glyph) {
          freeCode(this, old_code);
        }

        takeCode(this, new_code);
      }
    }

  });

}());
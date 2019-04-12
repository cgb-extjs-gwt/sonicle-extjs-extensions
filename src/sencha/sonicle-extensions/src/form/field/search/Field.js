/*
 * Sonicle ExtJs UX
 * Copyright (C) 2015 Sonicle S.r.l.
 * sonicle@sonicle.com
 * http://www.sonicle.com
 */
Ext.define('Sonicle.form.field.search.Field', {
	extend: 'Ext.form.field.Picker',
	xtype: 'sosearchfield',
	requires: [
		'Ext.layout.container.Fit',
		'Sonicle.form.field.search.Editor',
		'Sonicle.form.trigger.Clear',
		'Sonicle.plugin.FieldTooltip'
	],
	
	selectOnFocus: true,
	matchFieldWidth: false,
	plugins: ['sofieldtooltip'],
	
	searchText: 'Search',
	clearText: 'Clear',
	
	/**
     * @event query
	 * Fires when the user presses the ENTER key or clicks on the search icon.
	 * @param {Ext.form.field.Text} this
	 * @param {String} value Human-readable query text
	 * @param {Object} searchObject Parsed query-text result
     */
	
	constructor: function(cfg) {
		var me = this;
		cfg.triggers = Ext.apply(cfg.triggers || {}, {
			search: {
				cls: Ext.baseCSSPrefix + 'form-search-trigger',
				position: 'left', // possible thanks to custom override!!!
				tooltip: me.searchText,
				handler: function(s) {
					me.doQuery(s.getValue());
				}
			},
			clear: {
				type: 'soclear',
				weight: -1,
				tooltip: me.clearText,
				hideWhenEmpty: true,
				hideWhenMouseOut: true
			}
		});
		me.callParent([cfg]);
		me.isAvailSearchString = Ext.isDefined(window['SearchString']);
		me.checkAvail();
	},
	
	initComponent: function() {
		var me = this;
		me.callParent(arguments);
		me.on('clear', me.onClear, me);
		me.on('specialkey', me.onSpecialKey, me);
	},
	
	destroy: function() {
		var me = this;
		me.un('clear', me.onClear);
		me.un('specialkey', me.onSpecialKey);
		me.callParent();
	},
	
	createPicker: function() {
		var me = this, picker,
				winCfg = {
					xtype: 'window',
					closeAction: 'hide',
					referenceHolder: true,
					layout: 'fit',
					header: false,
					resizable: false,
					items: {
						xtype: 'sosearcheditor',
						reference: 'editor',
						bodyPadding: '0 10 0 10',
						fields: me.fields,
						okText: me.searchText
					},
					minWidth: 200
				};
		
		if (me.pickerWidth) winCfg.width = me.pickerWidth;
		me.pickerWindow = Ext.create(winCfg);
		
		me.queryPicker = picker = me.pickerWindow.lookupReference('editor');
		picker.on({
			scope: me,
			ok: me.onPickerOk,
			cancel: me.onPickerCancel
		});
		
		me.pickerWindow.on({
			close: 'onPickerCancel',
			scope: me
		});
		
		return me.pickerWindow;
	},
	
	/**
	 * Sets the hidden state of one/many query editor's field/s.
	 * @param {String|Object} fieldName The field to set, or an object containing key/value pairs.
	 * @param {Boolean} hidden
	 */
	setFieldHidden: function(fieldName, hidden) {
		var me = this, values;
		if (me.queryPicker) {
			me.queryPicker.setFieldHidden(arguments);
		}
		
		// Updates inner config
		if (me.fields) {
			if (Ext.isString(fieldName)) {
				values = [];
				values[fieldName] = hidden;
			} else {
				values = fieldName;
			}
			Ext.iterate(values, function(name, hidden) {
				if (me.fields[name] !== undefined) {
					me.fields[name] = hidden;
				}
			});
		}
	},
	
	onExpand: function() {
		var me = this;
		me.queryPicker.setPreviousValue(me.self.toRawQuery(me.value, 'in'));
		me.queryPicker.focusField();
	},
	
	onCollapse: function() {
		var me = this;
		me.inputEl.focus();
	},
	
	onMouseDown: function() {
		this.callParent(arguments);
		this.collapse();
	},
	
	onPickerOk: function(s, rawValue, searchObj) {
		var me = this,
				value = me.self.toHumanQuery(rawValue, 'out');
		me.setValue(value);
		me.doQuery(value, searchObj);
	},
	
	onPickerCancel: function(s) {
		this.collapse();
	},
	
	onClear: function(s) {
		this.doQuery(null);
	},

	onSpecialKey: function(s, e) {
		if (e.getKey() === e.ENTER) this.doQuery(s.getValue());
	},

	doQuery: function(value, searchObj) {
		var me = this;
		if (arguments.length === 1) {
			searchObj = me.self.parseHumanQuery(value);
		}
		me.collapse();
		me.fireEvent('query', me, value, searchObj);
	},
	
	privates: {
		checkAvail: function() {
			if (!this.isAvailSearchString) Ext.raise('Library search-string is required (see https://github.com/mixmaxhq/search-string).');
		}
	},
	
	statics: {
		parseHumanQuery: function(s) {
			return SearchString.parse(this.toRawQuery(s));
		},
		
		/**
		 * Translate a human-readable query into a raw one, replacing 
		 * round-parentesis notation with double-quotes:
		 *     (abcd) (efgh) -> "abcd" "efgh"
		 * @param {String} s Source string
		 * @returns {String} Output query
		 */
		toRawQuery: function(s) {
			return !Ext.isEmpty(s) ? s.replace(/"\((.*?)\)"/g, '"$1"') : s;
		},
		
		/**
		 * Translate a raw query into a human-readable one, replacing 
		 * double-quotes notation with round-parentesis:
		 *     abcd" "efgh" -> (abcd) (efgh)
		 * @param {String} s Source string
		 * @returns {String} Output query
		 */
		toHumanQuery: function(s) {
			return !Ext.isEmpty(s) ? s.replace(/"(.*?)"/g, '($1)') : s;
		}
	}
});
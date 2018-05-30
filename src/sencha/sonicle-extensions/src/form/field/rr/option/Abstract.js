/*
 * Sonicle ExtJs UX
 * Copyright (C) 2018 Sonicle S.r.l.
 * sonicle@sonicle.com
 * http://www.sonicle.com
 */
Ext.define('Sonicle.form.field.rr.option.Abstract', {
	extend: 'Ext.container.Container',
	requires: [
		'Sonicle.Date'
	],
	
	referenceHolder: true,
	layout: 'form',
	minHeight: 70,
	
	/**
	 * @cfg {RRule} rrule
	 * The underlying recurrence definition.
	 */
	rrule: undefined,
	
	/**
	 * @cfg {Date} startDate
	 * The start date of the underlying recurrence series.
	 */
	startDate: undefined,
	
	suspendOnChange: 0,
	rruleCfgChangeBuffer: 200,
	
	initComponent: function() {
		var me = this;
		me.callParent(arguments);
		me.setStartDate(me.startDate);
	},
	
	destroy: function() {
		var me = this,
            task = me.rruleCfgChangeTask;
		if (task) task.cancel();
		me.callParent();
	},
	
	/**
	 * This method must be overridden into child classes 
	 * to implement required custom logic.
	 * 
	 * @param {RRule} rr The RRule instance.
	 * @return {Boolean}
	 */
	validateRRule: function(rr) {
		Ext.raise('Override me');
	},
	
	/**
	 * This method should be overridden into child classes 
	 * to implement required custom logic.
	 * 
	 * @param {RRule} rr The RRule instance.
	 */
	applyRRule: function(rr) {
		
	},
	
	/**
	 * This method should be overridden into child classes 
	 * to implement required custom logic.
	 * 
	 * @param {Ext.form.field.Base} field
	 * @return {Boolean}
	 */
	shouldSkipChange: function(field) {
		return false;
	},
	
	/**
	 * This method must be overridden into child classes 
	 * to implement required custom logic.
	 * 
	 * @return {Object} RRule configuration
	 */
	getRRuleConfig: function() {
		Ext.raise('Override me');
	},
	
	/**
	 * This method can be overridden into child classes 
	 * to implement required custom logic.
	 * 
	 * @return {Object} Dynamic default configuration.
	 */
	calculateVMDataDefaults: function() {
		return {};
	},
	
	/**
	 * This method must be overridden into child classes
	 * to implement required custom logic.
	 * 
	 * @return {Object} Base default configuration.
	 */
	returnVMDataDefaults: function() {
		Ext.raise('Override me');
	},
	
	setStartDate: function(value) {
		var me = this;
		me.startDate = value;
		if (Ext.isDate(value)) {
			if (me.rrule && !me.validateRRule(me.rrule)) {
				me.getViewModel().set(me.getVMData());
			}
		}
	},
	
	setRRule: function(value) {
		var me = this;
		me.rrule = value;
		if (value === null) {
			return true;
		} else {
			if (me.validateRRule(value) !== false) {
				me.suspendOnChange++;
				me.applyRRule(value);
				Ext.defer(function() {
					me.suspendOnChange--;
				}, 200);
				return true;
			} else {
				return false;
			}
		}
	},
	
	getVMData: function() {
		var me = this,
				vm = me.getViewModel(),
				data = vm.getData();
		
		if (data.opt1 !== null) {
			return data;
		} else {
			data = Ext.apply({}, me.calculateVMDataDefaults(), me.returnVMDataDefaults());
			vm.setData(data);
			return data;
		}
	},
	
	optionSelectorOnChange: function(s, nv, ov) {
		var me = this;
		// Skip value changes originating from code/binding, we are interested
		// only in changes coming from user interaction.
		if (s.isXType('radiofield')) {
			// For radio fields we cannot rely on oldValue (is oldValue null?); 
			// we must use a private duringSetValue flag.
			if (!s.duringSetValue && (nv === true)) me.onRRuleCfgChange();
		}
	},
	
	fieldOnChange: function(s, nv, ov) {
		var me = this;
		if (me.shouldSkipChange(s) === false) {
			if (s.isXType('combo')) {
				// Within combos this is called by the select event in which
				// new and old values are not available. It' always a valid change.
				me.onRRuleCfgChange();
			} else if (s.isXType('checkboxfield') || s.isXType('radiofield')) {
				// For checkbox and radio fields we cannot rely on oldValue 
				// (is oldValue null?); we must use a private duringSetValue flag.
				if (!s.duringSetValue) me.onRRuleCfgChange();
			} else {
				//if (ov !== null) me.onRRuleCfgChange();
				me.onRRuleCfgChange();
			}
		}
	},
	
	onRRuleCfgChange: function() {
		if (this.suspendOnChange === 0) this.startRRuleCfgChangeTask();
	},
	
	startRRuleCfgChangeTask: function() {
		var me = this,
				task = me.rruleCfgChangeTask;
		if (!task) {
			me.rruleCfgChangeTask = task = new Ext.util.DelayedTask(me.doRRuleCfgChangeTask, me);
		}
		task.delay(me.rruleCfgChangeBuffer);
	},
	
	doRRuleCfgChangeTask: function() {
		this.fireEvent('rrulecfgchange', this, this.getRRuleConfig());
	},
	
	asArray: function(item) {
		if (Ext.isArray(item)) {
			return item;
		} else {
			return Ext.isDefined(item) ? [item] : [];
		}
	},
	
	byWeekdayToJsWeekday: function(byWeekday) {
		if (Ext.isArray(byWeekday)) {
			var arr = [];
			for (var i=0; i<byWeekday.length; i++) {
				arr.push(byWeekday[i].getJsWeekday());
			}
			return arr;
		} else {
			return byWeekday.getJsWeekday();
		}
	},
	
	jsWeekdayToByWeekday: function(jsWeekday) {
		if (Ext.isArray(jsWeekday)) {
			var arr = [];
			for (var i=0; i<jsWeekday.length; i++) {
				arr.push(this.jsWeekdayToRRuleWeekday(jsWeekday[i]));
			}
			return arr;
		} else {
			return this.jsWeekdayToRRuleWeekday(jsWeekday);
		}
	},
	
	jsWeekdayToRRuleWeekday: function(jsWeekday) {
		switch(jsWeekday) {
			case 0:
				return RRule.SU;
			case 1:
				return RRule.MO;
			case 2:
				return RRule.TU;
			case 3:
				return RRule.WE;
			case 4:
				return RRule.TH;
			case 5:
				return RRule.FR;
			case 6:
				return RRule.SA;
		}
	}
});

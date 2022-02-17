/*
 * Sonicle ExtJs UX
 * Copyright (C) 2015 Sonicle S.r.l.
 * sonicle@sonicle.com
 * http://www.sonicle.com
 * Inspired by:
 *	https://github.com/missive/emoji-mart
 */
Ext.define('Sonicle.picker.Emoji', {
	extend: 'Ext.tab.Panel',
	alias: ['widget.soemojipicker'],
	requires: [
		'Sonicle.Emojis',
		'Sonicle.EmojiPalette'
	],
	
	recentsText: 'Frequently used',
	peopleText: 'Smileys & People',
	natureText: 'Animals & Nature',
	foodsText: 'Food & Drink',
	activityText: 'Activity',
	placesText: 'Travel & Places',
	objectsText: 'Objects',
	symbolsText: 'Symbols',
	flagsText: 'Flags',
	
	border: false,
	
	initComponent: function() {
		var me = this, cmps;
		me.callParent(arguments);
		cmps = me.add([
			{
				xtype: 'soemojipalette',
				tooltip: me.peopleText,
				iconCls: 'far fa-smile',
				emojis: Sonicle.Emojis.lib.people
			}, {
				xtype: 'soemojipalette',
				tooltip: me.natureText,
				iconCls: 'fas fa-leaf',
				emojis: Sonicle.Emojis.lib.nature
			}, {
				xtype: 'soemojipalette',
				tooltip: me.foodsText,
				iconCls: 'fas fa-utensils',
				emojis: Sonicle.Emojis.lib.foods
			}, {
				xtype: 'soemojipalette',
				tooltip: me.activityText,
				iconCls: 'far fa-futbol',
				emojis: Sonicle.Emojis.lib.activity
			}, {
				xtype: 'soemojipalette',
				tooltip: me.placesText,
				iconCls: 'fas fa-car',
				emojis: Sonicle.Emojis.lib.places
			}, {
				xtype: 'soemojipalette',
				tooltip: me.peopleText,
				iconCls: 'far fa-lightbulb',
				emojis: Sonicle.Emojis.lib.objects
			}, {
				xtype: 'soemojipalette',
				tooltip: me.symbolsText,
				iconCls: 'fas fa-hashtag',
				emojis: Sonicle.Emojis.lib.symbols
			}
		]);
		
		Ext.iterate(cmps, function(cmp) {
			me.relayEvents(cmp, ['select']);
		});
	}
});

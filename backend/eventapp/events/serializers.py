from django.template.context_processors import request
from django.conf import settings
from .models import (
    User, Event, EventType, TicketClass, Ticket, DiscountCode, Comment, PaymentLog
)
from django.utils.timezone import now
from datetime import datetime
from rest_framework import serializers
from urllib.parse import quote
import unicodedata, random, string, qrcode, os

class EventTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventType
        fields = ['name']

class EventSerializer(serializers.ModelSerializer):

    class Meta:
        model = Event
        fields = ['id', 'name', 'image', 'user', 'event_type', 'location', 'description', 'start_time', 'end_time',
                  'active', 'popularity_score']
        read_only_fields = ['id', 'user', 'active', 'popularity_score']

    def get_image(self, obj):
        if obj.image:
            return obj.image.url
        return None

    def create(self, validated_data):
        user = self.context['request'].user
        location = validated_data.get('location', '')
        location_url = f"https://www.google.com/maps/search/?api=1&query={quote(location)}"
        validated_data['location'] = location_url
        return Event.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        location = validated_data.get('location', instance.location)
        if location != instance.location:
            location_url = f"https://www.google.com/maps/search/?api=1&query={quote(location)}"
            instance.location = location_url

        for attr, value in validated_data.items():
            if attr != 'location':
                setattr(instance, attr, value)

        instance.save()
        return instance

    def to_representation(self, instance):
        rep = super().to_representation(instance)

        # Chuyển đổi tên field về camelCase nếu cần (đã xử lý phần lớn qua source=...)
        # rep['eventType'] và các field khác đã đúng chuẩn

        return rep


class TicketClassSerializer(serializers.ModelSerializer):
    event_name = serializers.CharField(source='event.name', read_only=True)

    class Meta:
        model = TicketClass
        fields = ['id','name','price','type','total_available', 'event_name']
        read_only_fields = ['id', 'event_name']

    def create(self, validated_data):
        event = self.context.get('event')
        return TicketClass.objects.create(event=event, **validated_data)

class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['id','first_name', 'last_name', 'avatar', 'email', 'username', 'password', 'role', 'group']
        read_only_fields = ['group']
        extra_kwargs = {
            'password': {
                'write_only': True
            }
        }

    def get_avatar(self, obj):
        return obj.avatar.url if obj.avatar else None

    def create(self, validated_data):
        role = validated_data.get('role')
        user = User(**validated_data)
        user.set_password(validated_data['password'])

        if role and role.id == 1:
            user.is_superuser = True

        user.save()
        return user

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep.pop('password', None)
        return rep



class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'content', 'event', 'user', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class TicketSerializer(serializers.ModelSerializer):
    event_name = serializers.SerializerMethodField()
    ticket_classes = serializers.PrimaryKeyRelatedField(
        queryset=TicketClass.objects.all(),
        many=True
    )

    class Meta:
        model = Ticket
        fields = [
            'ticket_code',
            'ticket_classes',
            'user',
            'price_paid',
            'is_checked_in',
            'booked_at',
            'event_name'
        ]
        read_only_fields = [
            'ticket_code',
            'user',
            'price_paid',
            'is_checked_in',
            'booked_at',
            'event_name'
        ]

    def get_event_name(self, obj):
        events = set(tc.event.name for tc in obj.ticket_classes.all())
        return ", ".join(events) if events else None

    def validate(self, attrs):
        ticket_classes = attrs.get('ticket_classes', [])
        if not ticket_classes:
            raise serializers.ValidationError("Bạn phải chọn ít nhất một hạng vé.")

        for tc in ticket_classes:
            if tc.total_available <= 0:
                raise serializers.ValidationError(f"Hạng vé '{tc.name}' đã bán hết.")
        return attrs

    @staticmethod
    def create_qr_image(ticket_code):
        now = datetime.now()
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr.add_data(ticket_code)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        qr_folder = os.path.join(
            settings.MEDIA_ROOT,
            'ticket_qr',
            now.strftime('%Y'),
            now.strftime('%m')
        )
        os.makedirs(qr_folder, exist_ok=True)
        file_path = os.path.join(qr_folder, f'{ticket_code}.png')
        img.save(file_path)
        return file_path

    def create(self, validated_data):
        user = self.context['request'].user
        ticket_classes = validated_data.pop('ticket_classes')

        # Lấy sự kiện từ ticket_classes đầu tiên
        event = ticket_classes[0].event if ticket_classes else None

        # Rút gọn tên sự kiện để tạo code
        initials = ''.join([
            unicodedata.normalize('NFD', w)[0].upper()
            for w in event.name.split() if w
        ])
        initials = ''.join(
            c for c in unicodedata.normalize('NFD', initials)
            if unicodedata.category(c) != 'Mn'
        )
        event_date_str = event.start_time.strftime('%d%m%Y')

        # Sinh ticket_code duy nhất
        while True:
            suffix = ''.join(random.choices(string.digits, k=6))
            ticket_code = f"{initials}-{event_date_str}-{suffix}"
            if not Ticket.objects.filter(ticket_code=ticket_code).exists():
                break

        # Giảm số lượng còn lại cho từng TicketClass
        for tc in ticket_classes:
            tc.total_available -= 1
            tc.save()

        # Tính tổng giá tiền
        total_price = sum(tc.price for tc in ticket_classes)

        # Tạo Ticket
        ticket = Ticket.objects.create(
            user=user,
            price_paid=total_price,
            ticket_code=ticket_code
        )
        ticket.ticket_classes.set(ticket_classes)

        return ticket



class QRCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ['ticket_code', 'is_checked_in', 'checkin_time']
        read_only_fields = ['is_checked_in', 'checkin_time']

    # def validate_ticket_code(self, ticket_code):
    #     try:
    #         ticket = Ticket.objects.get(ticket_code=code)
    #     except Ticket.DoesNotExist:
    #         raise serializers.ValidationError("Mã vé không hợp lệ.")
    #
    #     if ticket.checked_in:
    #         raise serializers.ValidationError("Vé đã được check-in trước đó.")
    #     return ticket_code

class DiscountCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = '__all__'

    def validate(self, data):
        if data['discount_type'].id == 2:
            if data.get('discount_value', 0) > 100:
                raise serializers.ValidationError("Phần trăm giảm giá không được vượt quá 100%.")
            if data.get('limit_discount') and not data.get('max_discount_amount'):
                raise serializers.ValidationError("Phải nhập mức giảm tối đa khi giới hạn giảm giá.")
        return data


class PaymentLogSerializer(serializers.ModelSerializer):
    ticket_classes = serializers.StringRelatedField(many=True)
    discount_code = serializers.StringRelatedField()
    user = serializers.StringRelatedField()

    class Meta:
        model = PaymentLog
        fields = [
            'id', 'user', 'ticket_classes', 'discount_code', 'amount',
            'status', 'created_at', 'updated_at', 'transaction_id', 'ticket'
        ]